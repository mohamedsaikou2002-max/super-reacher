import { useEffect, useState } from "react";
import { ClipboardCopy, Globe2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { supabase } from "@/integrations/supabase/client";
import { ApprovedEmailSender } from "./ApprovedEmailSender";
import { GlobalRegistryPanel } from "./GlobalRegistryPanel";
import { markets } from "@/lib/email-templates";
import { lookupProfessionalContact } from "@/lib/prospect-lookup.functions";
import {
  buildOutreachDraft,
  CHANNELS,
  DEFAULT_PROFILE,
  SECTOR_PRESETS,
  type Channel,
  type OutreachDraft,
  type OutreachProfile,
} from "@/lib/global-outreach";

export function GlobalOutreachStudio({ userEmail }: { userEmail: string | null }) {
  const [profile, setProfile] = useState<OutreachProfile>(DEFAULT_PROFILE);
  const [preset, setPreset] = useState("general");
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookupProvider, setLookupProvider] = useState<"hunter" | "apollo">("hunter");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
    confidence: string;
  } | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!userEmail) return;
    let valid = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !valid) return;
      const { data } = await supabase
        .from("global_outreach_profiles")
        .select(
          "profession,audience,offer,value_proposition,preferred_channel,preferred_market,sender_name",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && valid) {
        setProfile({
          profession: data.profession,
          audience: data.audience,
          offer: data.offer,
          value_proposition: data.value_proposition,
          preferred_channel: data.preferred_channel as Channel,
          preferred_market: data.preferred_market,
          sender_name: data.sender_name,
        });
      }
    })().catch(() => {});
    return () => {
      valid = false;
    };
  }, [userEmail]);

  const update = (patch: Partial<OutreachProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setDraft(null);
    setStatus("");
  };

  async function saveProfile() {
    if (!userEmail) {
      setStatus("Sign in first to save your workspace.");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in first.");
      const { error } = await supabase
        .from("global_outreach_profiles")
        .upsert({ user_id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      setStatus("Workspace preferences saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function lookup() {
    if (!userEmail) {
      setStatus("Sign in before using contact enrichment.");
      return;
    }
    if (!contactName.trim() || !companyName.trim()) {
      setStatus("Provide full contact name and company.");
      return;
    }
    setLookupBusy(true);
    setLookupResult(null);
    try {
      const result = await lookupProfessionalContact({
        data: { provider: lookupProvider, fullName: contactName, companyName },
      });
      setLookupResult(
        result.contact
          ? {
              name: result.contact.name,
              role: result.contact.role,
              email: result.contact.email,
              phone: result.contact.phone,
              confidence: result.contact.confidence,
            }
          : null,
      );
      setStatus(
        result.contact
          ? "Provider match returned. Verify relevance and outreach eligibility independently."
          : "No contact match returned.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function copy(kind: "text" | "html") {
    const value = kind === "html" ? draft?.html : draft?.text;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Clipboard unavailable. Select and copy from the preview.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe2 size={21} /> Global Outreach Studio
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One workspace for aviation, real estate, finance, recruiting, technology, and any sales
            workflow.
          </p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <ShieldCheck size={14} /> Draft and review only · No automatic sending
        </div>
      </div>

      <GlobalRegistryPanel userEmail={userEmail} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            1 · Tailor to your profession
          </div>
          <label className="block text-xs text-muted-foreground">
            Industry preset
            <select
              className="mt-1 w-full"
              value={preset}
              onChange={(e) => {
                const id = e.target.value;
                setPreset(id);
                const sector = SECTOR_PRESETS.find((s) => s.id === id)!;
                update({ profession: sector.profession, audience: sector.audience });
              }}
            >
              {SECTOR_PRESETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Your role
              <input
                className="mt-1 w-full"
                value={profile.profession}
                maxLength={120}
                onChange={(e) => update({ profession: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Target audience
              <input
                className="mt-1 w-full"
                value={profile.audience}
                maxLength={160}
                onChange={(e) => update({ audience: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Your offer
            <input
              className="mt-1 w-full"
              value={profile.offer}
              maxLength={240}
              placeholder="e.g., private aircraft sourcing and acquisition advisory"
              onChange={(e) => update({ offer: e.target.value })}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Relevant benefit / value proposition
            <textarea
              className="mt-1 w-full min-h-20"
              value={profile.value_proposition}
              maxLength={320}
              placeholder="What benefit can you demonstrate for this particular recipient?"
              onChange={(e) => update({ value_proposition: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Sender / signature
              <input
                className="mt-1 w-full"
                maxLength={80}
                value={profile.sender_name}
                placeholder="Your name"
                onChange={(e) => update({ sender_name: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Target country / market
              <input
                className="mt-1 w-full"
                maxLength={40}
                list="reach-markets"
                value={profile.preferred_market}
                onChange={(e) => update({ preferred_market: e.target.value })}
                placeholder="Country code or region"
              />
              <datalist id="reach-markets">
                {markets.map((m) => (
                  <option key={m.code} value={m.code} label={m.name} />
                ))}
              </datalist>
            </label>
          </div>
          <Button variant="secondary" onClick={saveProfile} disabled={saving || !userEmail}>
            <Save size={13} /> {saving ? "Saving…" : "Save profile"}
          </Button>
          {!userEmail && (
            <p className="text-xs text-muted-foreground">
              Sign in to save preferences across sessions.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            2 · Choose how you work
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.note}
                onClick={() => update({ preferred_channel: c.id })}
                className={`rounded-lg border px-3 py-3 text-left text-xs ${profile.preferred_channel === c.id ? "border-primary bg-primary/10 font-bold text-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {c.label}
                <div className="mt-1 text-[10px] font-normal opacity-70">{c.note}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Phone calls, social platforms, and CRM tasks are manual-review workflows. Selecting a
            channel does not connect a sending account.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Prospect first name
              <input
                className="mt-1 w-full"
                value={contactName}
                placeholder="Alex"
                onChange={(e) => setContactName(e.target.value)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Prospect company
              <input
                className="mt-1 w-full"
                value={companyName}
                placeholder="Company / organization"
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </label>
          </div>
          <Button
            className="w-full"
            disabled={!profile.offer.trim() || !profile.value_proposition.trim()}
            onClick={() => {
              setDraft(
                buildOutreachDraft({
                  profile,
                  contactName,
                  companyName,
                  channel: profile.preferred_channel,
                  market: profile.preferred_market,
                }),
              );
              setStatus(
                "Draft generated. Review recipient eligibility and content before using it.",
              );
            }}
          >
            <Sparkles size={14} /> Generate channel-specific draft
          </Button>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="text-xs font-bold text-foreground">
              Optional: Professional contact enrichment
            </div>
            <p className="text-[11px] text-muted-foreground">
              One person at a time using your connected Apollo or Hunter account. Confirm you are
              permitted to use the results.
            </p>
            <div className="flex gap-2">
              <select
                value={lookupProvider}
                onChange={(e) => setLookupProvider(e.target.value as "hunter" | "apollo")}
                className="flex-1 text-xs"
              >
                <option value="hunter">Hunter</option>
                <option value="apollo">Apollo</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={lookup}
                disabled={lookupBusy || !userEmail || !contactName.trim() || !companyName.trim()}
              >
                {lookupBusy ? "Looking up…" : "Find professional contact"}
              </Button>
            </div>
            {lookupResult && (
              <div className="text-xs text-foreground">
                {lookupResult.name} · {lookupResult.role}
                <div className="mt-1">
                  {lookupResult.email || "No email"} · {lookupResult.phone || "No phone"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Provider confidence: {lookupResult.confidence}; independently verify before use
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-surface px-3 py-2 text-[11px] text-muted-foreground">
            Outreach should respect consent, suppression preferences, platform terms, and local
            country rules. Phone and SMS are not automatically dialed or sent.
          </div>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <h3 className="text-sm font-bold text-foreground">3 · Preview and approve</h3>
          {draft && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => copy("text")}>
                <ClipboardCopy size={12} /> Copy text
              </Button>
              {draft.html && (
                <Button size="sm" variant="secondary" onClick={() => copy("html")}>
                  <ClipboardCopy size={12} /> Copy HTML
                </Button>
              )}
            </div>
          )}
        </div>
        {draft ? (
          <>
            {draft.subject && (
              <p className="text-xs">
                <strong>Subject:</strong> {draft.subject}
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-4 text-xs leading-6 font-sans text-foreground">
              {draft.text}
            </pre>
            {draft.html && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">HTML email preview</summary>
                <iframe
                  title="HTML email preview"
                  srcDoc={draft.html}
                  sandbox=""
                  className="mt-2 h-80 w-full bg-white rounded-lg"
                />
              </details>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select your industry, enter your offer, choose a preferred channel, and generate a
            draft. No messages will be sent.
          </p>
        )}
        {status && (
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
        )}
      </section>
      <ApprovedEmailSender userEmail={userEmail} draft={draft} />
    </div>
  );
}
