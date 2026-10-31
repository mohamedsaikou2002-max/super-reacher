import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isValidEmail } from "./intelligence/compliance";

const SendInput = z.object({
  requestId: z.string().uuid(),
  contactId: z.string().uuid(),
  subject: z.string().trim().min(4).max(200),
  html: z.string().trim().min(20).max(25_000),
  approved: z.literal(true),
});

export const sendApprovedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SendInput.parse(data))
  .handler(async ({ data, context }) => {
    const approvedUsers = (process.env["OUTBOUND_APPROVED_USERS"] ?? "")
      .split(",")
      .map((s) => s.trim());
    if (process.env["OUTBOUND_ENABLED"] !== "true" || !approvedUsers.includes(context.userId)) {
      throw new Error("Outbound email is disabled for this account.");
    }
    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["RESEND_FROM_ADDRESS"];
    if (!apiKey || !from || !isValidEmail(from))
      throw new Error("Email provider or verified sender is not configured.");
    if (/<script\b|<iframe\b|on[a-z]+\s*=|javascript:/i.test(data.html)) {
      throw new Error("Email HTML contains disallowed active content.");
    }
    const { data: contact, error: contactError } = await context.supabase
      .from("contacts")
      .select("id,business_id,email,verification_status,outreach_status")
      .eq("id", data.contactId)
      .maybeSingle();
    if (contactError || !contact) throw new Error("Contact not found.");
    const { data: business } = await context.supabase
      .from("businesses")
      .select("id,outreach_eligibility")
      .eq("id", contact.business_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (
      !business ||
      business.outreach_eligibility !== "eligible" ||
      contact.outreach_status !== "eligible" ||
      contact.verification_status !== "verified" ||
      !isValidEmail(contact.email)
    )
      throw new Error("Contact is not verified and approved for outreach.");
    const email = contact.email.trim().toLowerCase();
    const { makeUnsubscribeUrl } = await import("./unsubscribe.server");
    const unsubscribeUrl = makeUnsubscribeUrl({
      userId: context.userId,
      contactId: contact.id,
      email,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { error: reservationError } = await admin.rpc("reserve_approved_email", {
      p_id: data.requestId,
      p_user_id: context.userId,
      p_contact_id: contact.id,
      p_subject: data.subject,
    });
    if (reservationError)
      throw new Error("Outbound approval rejected: " + reservationError.message);

    const html =
      data.html +
      '<p style="font-size:12px;color:#666">To stop future emails, <a href="' +
      unsubscribeUrl +
      '">unsubscribe here</a>.</p>';
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": data.requestId,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: data.subject,
          html,
          headers: {
            "List-Unsubscribe": "<" + unsubscribeUrl + ">",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
    } catch {
      await admin
        .from("email_dispatches")
        .update({
          status: "unknown",
          error_code: "provider_connection_uncertain",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.requestId);
      throw new Error(
        "Provider delivery status is uncertain. Check delivery history; do not retry this message automatically.",
      );
    }
    if (!response.ok) {
      const status = response.status >= 500 ? "unknown" : "failed";
      await admin
        .from("email_dispatches")
        .update({
          status,
          error_code: "provider_http_" + response.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.requestId);
      throw new Error(
        status === "unknown"
          ? "Provider status uncertain. Check provider dashboard."
          : "Email provider rejected the message (HTTP " + response.status + ").",
      );
    }
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) {
      await admin
        .from("email_dispatches")
        .update({
          status: "unknown",
          error_code: "missing_provider_id",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.requestId);
      throw new Error("Provider response missing delivery identifier.");
    }
    await admin
      .from("email_dispatches")
      .update({
        status: "submitted",
        provider_message_id: payload.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);
    await admin.from("outreach_events").insert({
      user_id: context.userId,
      business_id: business.id,
      contact_id: contact.id,
      channel: "email",
      event_type: "submitted",
      provider: "resend",
      metadata: { request_id: data.requestId, provider_message_id: payload.id },
    });
    return { status: "submitted" as const, requestId: data.requestId };
  });
