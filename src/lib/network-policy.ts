/**
 * Server outbound network policy. Deliberately fail-closed: operators must explicitly
 * trust each remote host. Do not permit arbitrary user-entered URLs through server fetch.
 */
const prohibitedSuffixes = [".localhost", ".local", ".internal", ".test", ".invalid", ".home.arpa", ".onion"];
const forbiddenExact = new Set(["localhost", "metadata.google.internal"]);

export function parseHostAllowlist(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((h) => h.trim().toLowerCase()).filter((h) =>
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(h) && h.includes(".")
    && !h.endsWith(".") && !forbiddenExact.has(h)
    && !prohibitedSuffixes.some((suffix) => h.endsWith(suffix))
    && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(h)
  );
}

export function validateTrustedHttpsUrl(
  input: string,
  hosts: readonly string[],
): URL {
  let parsed: URL;
  try { parsed = new URL(input); }
  catch { throw new Error("Invalid remote URL."); }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      (parsed.port && parsed.port !== "443") || parsed.hash ||
      host.includes(":") || host.includes("[") || host.endsWith(".") ||
      forbiddenExact.has(host) || prohibitedSuffixes.some((suffix) => host.endsWith(suffix)) ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    throw new Error("Remote URL is not an approved public HTTPS destination.");
  }
  if (!hosts.includes(host)) throw new Error("Remote host is not in the server allowlist.");
  return parsed;
}

/** A host allowlist is a defense only when its DNS zones are controlled by trusted operators.
 * Production egress firewalling must additionally block private/link-local/metadata addresses. */
export function trustedEngineEndpoint(input: string, route: "/api/health" | "/api/ai/complete", allowed: readonly string[]): string {
  const url = validateTrustedHttpsUrl(input, allowed);
  if (url.pathname !== "/" || url.search) throw new Error("Engine base URL must contain only a host.");
  url.pathname = route;
  return url.toString();
}
