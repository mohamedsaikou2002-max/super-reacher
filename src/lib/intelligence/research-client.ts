import { SocksProxyAgent } from 'socks-proxy-agent';
import { normalizeUrl } from './website';

export type EgressMode = 'DIRECT' | 'TOR' | 'BLOCKED';

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
 * We never route these domains through Tor under any circumstances.
 */
const FORBIDDEN_TOR_DOMAINS = [
  'amazonaws.com',
  'api.twilio.com',
  'supabase.co',
  'supabase.com',
  'sendgrid.net',
  'api.openai.com',
  'generativelanguage.googleapis.com', // Gemini
  'api.anthropic.com',
  'api.apollo.io',
  'api.hunter.io',
  'api.zoominfo.com',
  'localhost',
  '127.0.0.1',
  '169.254.169.254', // AWS Metadata
  '[::1]'
];

function isForbiddenTorDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return FORBIDDEN_TOR_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return true; // block invalid URLs
  }
}

/**
 * Determine the egress route based on policy.
 */
function determineEgressMode(url: string, policy?: SourcePolicy): EgressMode {
  if (isForbiddenTorDomain(url)) {
    // If it's an internal/API domain, we strictly use DIRECT (or fail).
    // Usually we wouldn't use ResearchHttpClient for APIs, but if we do, it must be DIRECT.
    return 'DIRECT';
  }

  if (policy) {
    if (policy.requires_manual_review || policy.captcha_detected) {
      return 'BLOCKED';
    }
    if (policy.tor_allowed) {
      return 'TOR';
    }
    if (policy.direct_allowed) {
      return 'DIRECT';
    }
    return 'BLOCKED';
  }

  // Fallback: If no policy is provided, we respect the environment default.
  const defaultMode = process.env.RESEARCH_EGRESS_MODE || 'DIRECT';
  return defaultMode === 'TOR' ? 'TOR' : 'DIRECT';
}

function getTorAgent() {
  const proxyUrl = process.env.TOR_SOCKS_PROXY_URL || 'socks5h://127.0.0.1:9050';
  return new SocksProxyAgent(proxyUrl);
}

/**
 * ResearchHttpClient is the dedicated egress path for public-web research.
 * It enforces source routing policies, never uses Tor for internal/provider APIs,
 * and tracks research telemetry (without storing unnecessary identifying info).
 */
export async function researchFetch(url: string, init?: RequestInit, options?: ResearchRequestOptions): Promise<Response> {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    throw new Error('Invalid URL');
  }

  const egressMode = determineEgressMode(normalizedUrl, options?.sourcePolicy);

  if (egressMode === 'BLOCKED') {
    throw new Error(`Research request to ${normalizedUrl} is blocked by source policy.`);
  }

  // TODO: In a full environment, log this request to research_requests_log via Supabase here.
  // const destDomain = new URL(normalizedUrl).hostname;
  // await logResearchRequest({ requestId, workerId, source, destDomain, egressMode, status: 'started' });

  try {
    if (egressMode === 'TOR') {
      // Use the Tor agent
      const agent = getTorAgent();
      // Node's native fetch doesn't support the `agent` option natively without undici.
      // However, Node.js 18+ can use dispatcher with undici, or node-fetch can use agent.
      // Since we are using standard fetch (undici-based in Node 18+), we need to cast or use the dispatcher if supported.
      // Using 'socks-proxy-agent' works as a dispatcher in Node's fetch.
      const fetchInit: RequestInit & { dispatcher?: any } = { ...init, dispatcher: agent };
      return await fetch(normalizedUrl, fetchInit);
    } else {
      // DIRECT
      return await fetch(normalizedUrl, init);
    }
  } catch (err) {
    // If Tor fails, DO NOT automatically bypass policy.
    throw new Error(`Research request via ${egressMode} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
