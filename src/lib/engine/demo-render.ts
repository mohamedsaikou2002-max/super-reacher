import { DEMO_TEMPLATES } from "./registry";

const THEMES: Record<string, { bg: string; glow: string; accent: string; ink: string }> = {
  lime: { bg: "#0d1014", glow: "#1d2a10", accent: "#b8ff32", ink: "#0d1408" },
  midnight: { bg: "#0d1117", glow: "#15243a", accent: "#58a6ff", ink: "#07111f" },
  ember: { bg: "#140d0d", glow: "#33160f", accent: "#ff8a3d", ink: "#1a0c04" },
  slate: { bg: "#101214", glow: "#1d2126", accent: "#d8dee6", ink: "#14181d" },
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDemo(
  company: string,
  templateId: string,
  theme: string,
  config: Record<string, unknown>,
): string {
  const template = DEMO_TEMPLATES[templateId] ?? DEMO_TEMPLATES["ai-receptionist"]!;
  const palette = THEMES[theme] ?? THEMES["lime"]!;
  const headline = esc(config["headline"] || template.headline);
  const cta = esc(config["primary_cta"] || "Request a walkthrough");
  const blurb = esc(
    config["blurb"] ||
      "Fast, branded, and isolated as a prospect-facing preview. Connect production data and workflows only after authorization.",
  );
  const name = esc(company);
  const product = esc(template.name);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} — ${product}</title><style>
:root{--bg:${palette.bg};--accent:${palette.accent};--ink:${palette.ink};--muted:#8d9490}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 80% 0,${palette.glow},var(--bg) 48%);color:#f2f5ef}
main{max-width:1100px;margin:auto;padding:72px 24px}
.pill{display:inline-block;border:1px solid #2c3230;border-radius:999px;padding:8px 12px;color:var(--muted);font-size:13px}
h1{font-size:clamp(40px,7vw,80px);line-height:.98;max-width:900px;margin:28px 0}
p{font-size:19px;color:var(--muted);max-width:700px;line-height:1.6}
.card{margin-top:48px;background:rgba(22,26,24,.86);border:1px solid #2c3230;border-radius:24px;padding:30px}
button{margin-top:24px;background:var(--accent);border:0;border-radius:12px;padding:14px 20px;font-weight:700;color:var(--ink);font-size:15px}
small{display:block;margin-top:48px;color:#5d6360}
</style></head><body><main>
<span class="pill">Interactive concept demo</span>
<h1>${headline}</h1>
<p>Prepared for <strong>${name}</strong>. This visual shows how a tailored ${product} experience could look and feel.</p>
<div class="card"><h2>${product}</h2><p>${blurb}</p><button>${cta}</button></div>
<small>Demo environment • Super Reacher Demo Studio</small>
</main></body></html>`;
}
