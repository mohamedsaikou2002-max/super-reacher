import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/resend-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const { verifyResendWebhook } = await import("@/lib/unsubscribe.server");
        if (
          !verifyResendWebhook(
            body,
            request.headers.get("svix-id"),
            request.headers.get("svix-timestamp"),
            request.headers.get("svix-signature"),
          )
        ) {
          return new Response("Invalid signature", { status: 401 });
        }
        let event: { type?: string; data?: { email_id?: string } };
        try {
          event = JSON.parse(body) as typeof event;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const events: Record<string, string> = {
          "email.delivered": "delivered",
          "email.bounced": "bounced",
          "email.complained": "complained",
        };
        const status = event.type ? events[event.type] : undefined;
        const messageId = event.data?.email_id;
        if (!status || !messageId) return new Response("OK");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data: job } = await admin
          .from("email_dispatches")
          .select("id,user_id,contact_id")
          .eq("provider_message_id", messageId)
          .maybeSingle();
        if (!job) return new Response("OK");
        const { error } = await admin
          .from("email_dispatches")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", job.id);
        if (error) return new Response("Database unavailable", { status: 503 });
        await admin.from("outreach_events").insert({
          user_id: job.user_id,
          contact_id: job.contact_id,
          channel: "email",
          event_type: status,
          provider: "resend",
          metadata: { provider_message_id: messageId },
        });
        if (status === "bounced" || status === "complained") {
          const { data: contact } = await admin
            .from("contacts")
            .select("email")
            .eq("id", job.contact_id)
            .maybeSingle();
          if (contact?.email) {
            const { data: suppressions } = await admin
              .from("suppressions")
              .select("id")
              .eq("user_id", job.user_id)
              .eq("email", contact.email)
              .eq("channel", "global")
              .limit(1);
            if (!suppressions?.length)
              await admin.from("suppressions").insert({
                user_id: job.user_id,
                email: contact.email,
                phone: "",
                channel: "global",
                reason: status,
              });
          }
        }
        return new Response("OK");
      },
    },
  },
});
