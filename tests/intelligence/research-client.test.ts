import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { researchFetch, type SourcePolicy } from "../../src/lib/intelligence/research-client";

const originalFetch = globalThis.fetch;
const originalAllowlist = process.env["RESEARCH_ALLOWED_HOSTS"];
const originalMode = process.env["RESEARCH_EGRESS_MODE"];
beforeEach(() => {
  process.env["RESEARCH_ALLOWED_HOSTS"] = "example.com";
  process.env["RESEARCH_EGRESS_MODE"] = "DIRECT";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAllowlist === undefined) delete process.env["RESEARCH_ALLOWED_HOSTS"];
  else process.env["RESEARCH_ALLOWED_HOSTS"] = originalAllowlist;
  if (originalMode === undefined) delete process.env["RESEARCH_EGRESS_MODE"];
  else process.env["RESEARCH_EGRESS_MODE"] = originalMode;
});

const allowed: SourcePolicy = {
  source: "example.com",
  tor_allowed: false,
  direct_allowed: true,
  requires_manual_review: false,
  captcha_detected: false,
};
describe("ResearchHttpClient restricted routing", () => {
  it("allows explicitly trusted hosts directly with redirects disabled", async () => {
    const mock = vi.fn().mockResolvedValue(new Response("ok"));
    globalThis.fetch = mock;
    await researchFetch("https://example.com", undefined, { sourcePolicy: allowed });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]?.[1]?.redirect).toBe("error");
  });
  it("blocks external hosts that are not on the operator allowlist", async () => {
    const mock = vi.fn().mockResolvedValue(new Response("ok"));
    globalThis.fetch = mock;
    await expect(
      researchFetch("https://api.twilio.com/v1/Messages", undefined, {
        sourcePolicy: { ...allowed, tor_allowed: true },
      }),
    ).rejects.toThrow(/allowlist/);
    expect(mock).not.toHaveBeenCalled();
  });
  it("fails closed instead of using an unverified Tor adapter", async () => {
    await expect(
      researchFetch("https://example.com", undefined, {
        sourcePolicy: { ...allowed, direct_allowed: false, tor_allowed: true },
      }),
    ).rejects.toThrow(/blocks direct research/);
  });
  it("blocks manually reviewed and CAPTCHA-protected sources", async () => {
    await expect(
      researchFetch("https://example.com", undefined, {
        sourcePolicy: { ...allowed, requires_manual_review: true },
      }),
    ).rejects.toThrow(/Source policy blocks direct research/);
    await expect(
      researchFetch("https://example.com", undefined, {
        sourcePolicy: { ...allowed, captcha_detected: true },
      }),
    ).rejects.toThrow(/Source policy blocks direct research/);
  });
});
