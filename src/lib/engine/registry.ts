// Shared, client-safe engine metadata. Ported from the FastAPI engine
// (app/ai/model_registry.py, app/ai/cost_policy.py, app/deployment/templates.py).

export type ProviderTier = "local" | "free_hosted" | "paid_api" | "remote_gpu";

export type ModelInfo = {
  id: string;
  provider: string;
  tier: ProviderTier;
  context_window: number;
  notes: string;
};

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: "openai/gpt-6-astra",
    provider: "lovable",
    tier: "free_hosted",
    context_window: 400_000,
    notes: "Hosted reasoning model used by the built-in agents",
  },
  {
    id: "llama3.1",
    provider: "ollama",
    tier: "local",
    context_window: 128_000,
    notes: "General purpose local model (self-hosted engine)",
  },
  {
    id: "qwen2.5-coder",
    provider: "ollama",
    tier: "local",
    context_window: 32_000,
    notes: "Local coding model (self-hosted engine)",
  },
  {
    id: "local-model",
    provider: "lmstudio",
    tier: "local",
    context_window: 32_000,
    notes: "Whatever is loaded in LM Studio",
  },
  {
    id: "gemini-1.5-flash",
    provider: "gemini",
    tier: "free_hosted",
    context_window: 1_000_000,
    notes: "Free-tier hosted, 7-key pool",
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    tier: "paid_api",
    context_window: 128_000,
    notes: "Fast, cheap, still metered",
  },
];

export type AgentType = "research" | "outreach" | "coding" | "creative";

export const AGENTS: { name: AgentType; label: string; summary: string }[] = [
  { name: "research", label: "Research", summary: "Finds and enriches prospect data from a brief." },
  { name: "outreach", label: "Outreach", summary: "Drafts compliant, opt-out friendly outreach copy." },
  { name: "coding", label: "Coding", summary: "Writes and reviews code against a task description." },
  { name: "creative", label: "Creative", summary: "Produces landing copy, angles and creative concepts." },
];

export const CORPUS_STAGES = ["raw", "normalized", "reviewed", "exported"] as const;
export type CorpusStage = (typeof CORPUS_STAGES)[number];

export type CostFlags = {
  local_first: boolean;
  allow_paid_apis: boolean;
  allow_remote_gpu: boolean;
  require_cost_approval: boolean;
};

export type CostDecision = { allowed: boolean; reason: string; requires_approval: boolean };

export function evaluateCostPolicy(tier: ProviderTier, flags: CostFlags): CostDecision {
  if (tier === "local") {
    return { allowed: true, reason: "local providers are always allowed", requires_approval: false };
  }
  if (tier === "free_hosted") {
    return { allowed: true, reason: "free-hosted tier allowed by default", requires_approval: false };
  }
  if (tier === "paid_api") {
    if (!flags.allow_paid_apis) {
      return { allowed: false, reason: "Paid APIs are turned off", requires_approval: false };
    }
    return {
      allowed: true,
      reason: flags.require_cost_approval ? "paid API allowed pending per-job approval" : "paid API allowed",
      requires_approval: flags.require_cost_approval,
    };
  }
  if (tier === "remote_gpu") {
    if (!flags.allow_remote_gpu) {
      return { allowed: false, reason: "Remote GPU is turned off", requires_approval: false };
    }
    return {
      allowed: true,
      reason: flags.require_cost_approval ? "remote GPU allowed pending per-job approval" : "remote GPU allowed",
      requires_approval: flags.require_cost_approval,
    };
  }
  return { allowed: false, reason: `unknown tier ${tier}`, requires_approval: false };
}

export const DEMO_TEMPLATES: Record<string, { name: string; headline: string }> = {
  "ai-receptionist": { name: "AI Receptionist", headline: "Never miss another customer call" },
  "ai-crm": { name: "AI CRM", headline: "Turn follow-up into a system" },
  "ai-sales-agent": { name: "AI Sales Agent", headline: "A faster path from lead to conversation" },
  "cybersecurity-dashboard": { name: "Cybersecurity Dashboard", headline: "See operational risk at a glance" },
  "executive-dashboard": { name: "Executive Dashboard", headline: "One view of the metrics that matter" },
  "nervous-system-dashboard": { name: "Nervous System Dashboard", headline: "Make state and recovery visible" },
};

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "demo"
  );
}
