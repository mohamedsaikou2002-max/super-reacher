import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createUnsubscribeToken, verifyUnsubscribeToken, verifyResendWebhook } from "../src/lib/unsubscribe.server";

const identity = {
  userId: "c961cbe2-bbce-4c1a-8240-8a953cd030dc",
  contactId: "d0cda67f-896d-460b-a89e-b185a70b4433",
  email: "person@example.com",
};
const originalSign = process.env["UNSUBSCRIBE_SIGNING_SECRET"];
const originalWebhook = process.env["RESEND_WEBHOOK_SECRET"];
beforeEach(() => {
  process.env["UNSUBSCRIBE_SIGNING_SECRET"] = "sufficiently-long-test-signing-secret-for-local-testing";
  process.env["RESEND_WEBHOOK_SECRET"] = "whsec_" + Buffer.alloc(32,3).toString("base64");
});
afterEach(() => {
  if (originalSign === undefined) delete process.env["UNSUBSCRIBE_SIGNING_SECRET"];
  else process.env["UNSUBSCRIBE_SIGNING_SECRET"] = originalSign;
  if (originalWebhook === undefined) delete process.env["RESEND_WEBHOOK_SECRET"];
  else process.env["RESEND_WEBHOOK_SECRET"] = originalWebhook;
});

describe("Unsubscribe and delivery callback security", () => {
  it("round trips signed identity without exposing signing key", () => {
    const token = createUnsubscribeToken(identity);
    expect(verifyUnsubscribeToken(token)).toEqual(identity);
    expect(token).not.toContain(process.env["UNSUBSCRIBE_SIGNING_SECRET"]!);
  });
  it("rejects modified token or missing signature", () => {
    const token = createUnsubscribeToken(identity);
    expect(verifyUnsubscribeToken(token.slice(0,-2) + "xx")).toBeNull();
    expect(verifyUnsubscribeToken(token.split(".")[0] ?? "")).toBeNull();
  });
  it("checks Svix signature against the raw body", () => {
    const id = "msg_test", stamp = String(Math.floor(Date.now()/1000));
    const body = JSON.stringify({type:"email.delivered",data:{email_id:"abc"}});
    const hmac = createHmac("sha256",Buffer.alloc(32,3)).update(id+"."+stamp+"."+body).digest("base64");
    expect(verifyResendWebhook(body,id,stamp,"v1,"+hmac)).toBe(true);
    expect(verifyResendWebhook(body+" ",id,stamp,"v1,"+hmac)).toBe(false);
    expect(verifyResendWebhook(body,id,"1000000000","v1,"+hmac)).toBe(false);
  });
});
