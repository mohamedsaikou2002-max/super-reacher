import { normalizeUrl } from "./website";
import { parseHostAllowlist, validateTrustedHttpsUrl } from "../network-policy";

export type EgressMode = "DIRECT" | "TOR" | "BLOCKED";
export type SourcePolicy = {
  source: string;
  tor_allowed: boolean;
  direct_allowed: boolean;
  requires_manual_review: boolean;
  captcha_detected: boolean;
};
export type ResearchRequestOptions = {
  requestId?: string;
  workerId?: string;
  sourcePolicy?: SourcePolicy;
};

/**
 * Intentionally narrow gateway for server-side research.
 * Public website discovery/crawling should ordinarily run through Firecrawl's
 * fixed vendor endpoint, which performs its own network access.
 * RESEARCH_ALLOWED_HOSTS must contain ONLY administrator-approved DNS zones.
 */
export async function researchFetch(
  url: string, init?: RequestInit, options?: ResearchRequestOptions,
): Promise<Response> {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) throw new Error("Invalid research URL.");
  const policy = options?.sourcePolicy;
  if (policy?.captcha_detected || policy?.requires_manual_review ||
      (policy && !policy.direct_allowed) || process.env["RESEARCH_EGRESS_MODE"] === "BLOCKED") {
    throw new Error("Source policy blocks direct research.");
  }
  // Tor is intentionally not offered here. Previous implementation passed
  // SocksProxyAgent as an undici Dispatcher; that assumption was unverified.
  if (process.env["RESEARCH_EGRESS_MODE"] === "TOR" || (policy?.tor_allowed && !policy.direct_allowed)) {
    throw new Error("Tor research transport is disabled pending an audited adapter.");
  }
  const target = validateTrustedHttpsUrl(
    normalizedUrl,
    parseHostAllowlist(process.env["RESEARCH_ALLOWED_HOSTS"]),
  );

  const { signal: callerSignal, ...otherOptions } = init ?? {};
  // No implicit redirect: a trusted host must not redirect to an internal IP.
  // Block caller attempts to override redirect or timeout behavior.
  const timeoutSignal = AbortSignal.timeout(12_000);
  let signal = timeoutSignal;
  if (callerSignal && typeof AbortSignal.any === "function") {
    signal = AbortSignal.any([callerSignal, timeoutSignal]);
  }
  return fetch(target, { ...otherOptions, redirect: "error", signal });
}
