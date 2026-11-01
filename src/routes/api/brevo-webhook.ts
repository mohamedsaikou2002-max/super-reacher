import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

type BrevoEvent = {
  event?: string;
  email?: string;
  "message-id"?: string;
};
const changes: Record<string, "delivered" | "bounced" | "complained"> = {
  delivered: "delivered",
  hard_bounce: "bounced",
  spam: "complained",
};
function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 24 || !header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const Route = createFileRoute("/api/brevo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request.headers.get("authorization"), process.env["BREVO_WEBHOOK_TOKEN"]))
          return new Response("Unauthorized", { status: 401 });
        if (Number(request.headers.get("content-length") || 0) > 65536)
          return new Response("Too large", { status: 413 });
        let body: BrevoEvent | BrevoEvent[];
        try {
          const text = await request.text();
          if (text.length > 65536) return new Response("Too large", { status: 413 });
          body = JSON.parse(text) as typeof body;
        } catch { return new Response("Malformed event", { status: 400 }); }
        const events = Array.isArray(body) ? body.slice(0, 50) : [body];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        for (const item of events) {
          const eventName = item?.event;
          const providerId = item?.["message-id"]?.trim();
          if (!providerId || typeof eventName !== "string" || providerId.length > 500) continue;
          const { data: dispatch, error: lookupError } = await db.from("email_dispatches")
            .select("id,user_id,contact_id,status")
            .eq("provider_message_id", providerId)
            .maybeSingle();
          if (lookupError) return new Response("Database unavailable", { status: 503 });
          if (!dispatch) continue;
          const status = changes[eventName];
          if (!status && eventName !== "unsubscribed") continue;
          if (status && dispatch.status !== status) {
            // Never downgrade a recorded complaint/bounce to a later delivered status.
            if (dispatch.status !== "bounced" && dispatch.status !== "complained") {
              const { error } = await db.from("email_dispatches")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", dispatch.id);
              if (error) return new Response("Database unavailable", { status: 503 });
            }
          }
          if (status) {
            await db.from("outreach_events").insert({
              user_id: dispatch.user_id, contact_id: dispatch.contact_id,
              channel: "email", event_type: status, provider: "brevo",
              metadata: { provider_message_id: providerId },
            });
          }
          if (eventName === "hard_bounce" || eventName === "spam" || eventName === "unsubscribed") {
            const { data: contact, error: contactError } = await db.from("contacts")
              .select("email").eq("id", dispatch.contact_id).maybeSingle();
            if (contactError) return new Response("Database unavailable", { status: 503 });
            if (!contact?.email) continue;
            const email = contact.email.toLowerCase().trim();
            const { data: previous, error: suppressError } = await db.from("suppressions")
              .select("id").eq("user_id", dispatch.user_id).eq("email", email)
              .eq("channel", "global").limit(1);
            if (suppressError) return new Response("Database unavailable", { status: 503 });
            if (!previous?.length) {
              const { error } = await db.from("suppressions").insert({
                user_id: dispatch.user_id, email, phone: "", channel: "global",
                reason: eventName === "unsubscribed" ? "recipient_unsubscribed" : eventName,
              });
              if (error) return new Response("Database unavailable", { status: 503 });
            }
          }
        }
        return new Response("OK");
      },
    },
  },
});
