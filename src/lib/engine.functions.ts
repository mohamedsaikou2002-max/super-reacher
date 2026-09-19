import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";
import { renderDemo } from "./engine/demo-render";
import {
  MODEL_REGISTRY,
  evaluateCostPolicy,
  slugify,
  type AgentType,
  type ProviderTier,
} from "./engine/registry";

type EngineSettings = {
  local_first: boolean;
  allow_paid_apis: boolean;
  allow_remote_gpu: boolean;
  require_cost_approval: boolean;
  engine_base_url: string;
  engine_api_key: string;
  engine_enabled: boolean;
};

const AGENT_PROMPTS: Record<AgentType, string> = {
  research:
    "You are a B2B research analyst. From the brief, produce a concise, factual prospect research note: company profile, likely pain points, buying signals and three angles to open a conversation. Never invent specific contact details.",
  outreach:
    "You draft short, honest, opt-out friendly outreach copy. Keep it under 130 words, no hype, one clear question, and always end with a one-line unsubscribe note. Return a subject line followed by the body.",
  coding:
    "You are a senior engineer. Answer with working code plus a brief explanation of the approach and any trade-offs. Prefer small, reviewable changes.",
  creative:
    "You are a creative director. Produce landing page copy: a headline, a subheadline, three benefit bullets and one call to action. Keep it specific and concrete.",
};

function tierForModel(modelId: string): ProviderTier {
  return MODEL_REGISTRY.find((m) => m.id === modelId)?.tier ?? "free_hosted";
}

async function loadSettings(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<EngineSettings> {
  const { data } = await supabase
    .from("engine_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    local_first: data?.local_first ?? true,
    allow_paid_apis: data?.allow_paid_apis ?? false,
    allow_remote_gpu: data?.allow_remote_gpu ?? false,
    require_cost_approval: data?.require_cost_approval ?? true,
    engine_base_url: (data?.engine_base_url ?? "").replace(/\/+$/, ""),
    engine_api_key: data?.engine_api_key ?? "",
    engine_enabled: data?.engine_enabled ?? false,
  };
}

async function callSelfHostedEngine(
  settings: EngineSettings,
  model: string,
  system: string,
  prompt: string,
): Promise<{ text: string; provider: string; model: string; cost: number }> {
  const res = await fetch(`${settings.engine_base_url}/api/ai/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.engine_api_key ? { "x-api-key": settings.engine_api_key } : {}),
    },
    body: JSON.stringify({ model, prompt, system, temperature: 0.3, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Self-hosted engine replied ${res.status}`);
  const body = (await res.json()) as {
    text?: string;
    provider?: string;
    model?: string;
    cost_usd?: number;
  };
  return {
    text: body.text ?? "",
    provider: `self-hosted:${body.provider ?? "unknown"}`,
    model: body.model ?? model,
    cost: body.cost_usd ?? 0,
  };
}

async function callLovableAi(
  system: string,
  prompt: string,
): Promise<{ text: string; provider: string; model: string; cost: number }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: lovable.responses("openai/gpt-6-astra"),
    system,
    prompt,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  return { text, provider: "lovable", model: "openai/gpt-6-astra", cost: 0 };
}

/* ---------------------------------------------------------------- health */

export const checkEngineHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const settings = await loadSettings(context.supabase as never, context.userId);
    const providers: Record<
      string,
      { healthy: boolean; is_local: boolean; is_free: boolean; tier: ProviderTier; detail: string }
    > = {
      lovable: {
        healthy: Boolean(process.env["LOVABLE_API_KEY"]),
        is_local: false,
        is_free: true,
        tier: "free_hosted",
        detail: "Built-in hosted models",
      },
    };

    if (settings.engine_enabled && settings.engine_base_url) {
      let healthy = false;
      let detail = "unreachable";
      try {
        const res = await fetch(`${settings.engine_base_url}/api/health`, {
          headers: settings.engine_api_key ? { "x-api-key": settings.engine_api_key } : {},
        });
        healthy = res.ok;
        detail = res.ok ? "self-hosted engine online" : `HTTP ${res.status}`;
      } catch (error) {
        detail = error instanceof Error ? error.message : "unreachable";
      }
      providers["self-hosted"] = {
        healthy,
        is_local: true,
        is_free: true,
        tier: "local",
        detail,
      };
    }

    return { providers, settings: { ...settings, engine_api_key: settings.engine_api_key ? "set" : "" } };
  });

/* ------------------------------------------------------------------ jobs */

const RunJobInput = z.object({ jobId: z.string().uuid() });

export const runAgentJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunJobInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");

    const settings = await loadSettings(supabase as never, userId);
    const payload = (job.payload ?? {}) as { prompt?: string; model?: string };
    const prompt = payload.prompt?.trim() || "No brief supplied.";
    const useSelfHosted = settings.engine_enabled && Boolean(settings.engine_base_url);
    const model = payload.model || (useSelfHosted ? "llama3.1" : "openai/gpt-6-astra");

    const decision = evaluateCostPolicy(tierForModel(model), settings);
    if (!decision.allowed || decision.requires_approval) {
      await supabase.from("approval_requests").insert({
        user_id: userId,
        job_id: job.id,
        tier: tierForModel(model),
        estimated_cost_usd: 0.01,
        reason: decision.reason,
      });
      await supabase
        .from("jobs")
        .update({ status: "awaiting_approval", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      return { status: "awaiting_approval" as const, reason: decision.reason, result: null };
    }

    await supabase
      .from("jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    const system = AGENT_PROMPTS[job.agent_type as AgentType] ?? AGENT_PROMPTS.research;
    try {
      let outcome;
      if (useSelfHosted) {
        try {
          outcome = await callSelfHostedEngine(settings, model, system, prompt);
        } catch {
          outcome = await callLovableAi(system, prompt);
        }
      } else {
        outcome = await callLovableAi(system, prompt);
      }
      await supabase
        .from("jobs")
        .update({
          status: "succeeded",
          result: outcome.text,
          provider_used: outcome.provider,
          model_used: outcome.model,
          cost_usd: outcome.cost,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return { status: "succeeded" as const, reason: "", result: outcome.text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent run failed";
      await supabase
        .from("jobs")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", job.id);
      return { status: "failed" as const, reason: message, result: null };
    }
  });

const CreateJobInput = z.object({
  agent_type: z.enum(["research", "outreach", "coding", "creative"]),
  prompt: z.string().min(1).max(8000),
  model: z.string().max(120).optional(),
  run: z.boolean().optional(),
});

export const createAgentJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateJobInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .insert({
        user_id: context.userId,
        agent_type: data.agent_type,
        payload: { prompt: data.prompt, ...(data.model ? { model: data.model } : {}) },
      })
      .select("id")
      .single();
    if (error || !job) throw new Error(error?.message ?? "Could not queue the job");
    return { id: job.id as string };
  });

/* ----------------------------------------------------------------- demos */

const DemoInput = z.object({
  company_name: z.string().min(1).max(160),
  template: z.string().min(1).max(64),
  theme: z.string().min(1).max(32),
  headline: z.string().max(200).optional(),
  primary_cta: z.string().max(80).optional(),
  blurb: z.string().max(600).optional(),
});

export const createDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DemoInput.parse(input))
  .handler(async ({ data, context }) => {
    const configuration = {
      ...(data.headline ? { headline: data.headline } : {}),
      ...(data.primary_cta ? { primary_cta: data.primary_cta } : {}),
      ...(data.blurb ? { blurb: data.blurb } : {}),
    };
    const slug = `${slugify(data.company_name)}-${Math.random().toString(36).slice(2, 6)}`;
    const html = renderDemo(data.company_name, data.template, data.theme, configuration);
    const { data: demo, error } = await context.supabase
      .from("demos")
      .insert({
        user_id: context.userId,
        company_name: data.company_name,
        slug,
        template_id: data.template,
        theme: data.theme,
        configuration,
        html,
        status: "draft",
      })
      .select("*")
      .single();
    if (error || !demo) throw new Error(error?.message ?? "Could not create the demo");
    return demo;
  });

const DemoIdInput = z.object({ demoId: z.string().uuid() });

export const deployDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DemoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: demo } = await supabase
      .from("demos")
      .select("*")
      .eq("id", data.demoId)
      .maybeSingle();
    if (!demo) throw new Error("Demo not found");

    const html = renderDemo(
      demo.company_name,
      demo.template_id,
      demo.theme,
      (demo.configuration ?? {}) as Record<string, unknown>,
    );
    const url = `/d/${demo.slug}`;
    const { data: deployment } = await supabase
      .from("deployments")
      .insert({ user_id: userId, demo_id: demo.id, status: "deploying", log: "Rendering artifact" })
      .select("id")
      .single();

    const { data: updated, error } = await supabase
      .from("demos")
      .update({
        html,
        status: "live",
        deployment_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", demo.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (deployment) {
      await supabase
        .from("deployments")
        .update({
          status: "live",
          deployment_url: url,
          log: "Artifact published",
          finished_at: new Date().toISOString(),
        })
        .eq("id", deployment.id);
    }
    return updated;
  });

export const previewDemoHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DemoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: demo } = await context.supabase
      .from("demos")
      .select("*")
      .eq("id", data.demoId)
      .maybeSingle();
    if (!demo) throw new Error("Demo not found");
    return {
      html: renderDemo(
        demo.company_name,
        demo.template_id,
        demo.theme,
        (demo.configuration ?? {}) as Record<string, unknown>,
      ),
    };
  });
