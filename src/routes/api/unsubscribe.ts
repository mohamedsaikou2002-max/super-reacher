import { createFileRoute } from "@tanstack/react-router";

function page(body: string, status = 200): Response {
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unsubscribe</title></head><body style="font:16px system-ui;max-width:35rem;margin:4rem auto;padding:1rem"><h1>Email preferences</h1>' + body + "</body></html>", {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
export const Route = createFileRoute("/api/unsubscribe")({
  server: { handlers: {
    GET: async ({ request }) => {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      const { verifyUnsubscribeToken } = await import("@/lib/unsubscribe.server");
      if (!verifyUnsubscribeToken(token)) return page("<p>Invalid unsubscribe link.</p>", 400);
      return page('<p>Stop receiving outreach to this email address?</p><form method="POST"><button type="submit">Unsubscribe</button></form>');
    },
    POST: async ({ request }) => {
      const url = new URL(request.url);
      const token = url.searchParams.get("token") ?? "";
      const { verifyUnsubscribeToken } = await import("@/lib/unsubscribe.server");
      const identity = verifyUnsubscribeToken(token);
      if (!identity) return page("<p>Invalid unsubscribe link.</p>", 400);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as any;
      const { data: existing } = await admin.from("suppressions").select("id")
        .eq("user_id",identity.userId).eq("email",identity.email).eq("channel","global").limit(1);
      if (!existing?.length) {
        const { error } = await admin.from("suppressions").insert({
          user_id:identity.userId,email:identity.email,phone:"",channel:"global",reason:"recipient_unsubscribed",
        });
        if (error) return page("<p>Could not update your preferences. Please contact the sender.</p>",500);
      }
      return page("<p>Unsubscribed. No further outreach will be sent to this address from this account.</p>");
    },
  } },
});
