import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import {
  deleteMyIntegration,
  listMyIntegrations,
  saveMyIntegration,
} from "@/lib/integrations.functions";

type Provider = "groq" | "apollo" | "hunter" | "firecrawl" | "gemini";
type Credential = {
  provider: Provider;
  key_hint: string;
  cost_acknowledged: boolean;
  updated_at: string;
};
const PROVIDERS: { id: Provider; label: string; purpose: string; state: string }[] = [
  {
    id: "groq",
    label: "Groq",
    purpose: "AI research and copy drafting in Agent Terminal",
    state: "Integrated with agent runner",
  },
  {
    id: "apollo",
    label: "Apollo",
    purpose: "One-contact professional research in Global Outreach Studio",
    state: "Connected to manual enrichment lookup",
  },
  {
    id: "hunter",
    label: "Hunter",
    purpose: "Manual professional contact research in Global Outreach Studio",
    state: "Connected to manual enrichment lookup",
  },
  {
    id: "firecrawl",
    label: "Firecrawl",
    purpose: "Official website crawling from business intelligence",
    state: "Connected to server crawl adapter",
  },
  {
    id: "gemini",
    label: "Gemini",
    purpose: "Reserved for a future AI adapter",
    state: "Key storage only",
  },
];

export function BringYourOwnApi({ userEmail }: { userEmail: string | null }) {
  const [connected, setConnected] = useState<Credential[]>([]);
  const [editing, setEditing] = useState<Provider>("groq");
  const [secret, setSecret] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function refresh() {
    if (!userEmail) {
      setConnected([]);
      return;
    }
    try {
      const result = await listMyIntegrations();
      setConnected(result.credentials as Credential[]);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Connection status unavailable.");
    }
  }
  useEffect(() => {
    void refresh();
  }, [userEmail]);

  async function save() {
    if (!userEmail) {
      setStatus("Sign in before connecting a provider.");
      return;
    }
    setBusy(true);
    try {
      await saveMyIntegration({ data: { provider: editing, secret, costAcknowledged: ack } });
      setSecret("");
      setStatus(
        `${editing.toUpperCase()} credential saved. Live provider verification has not been performed.`,
      );
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(provider: Provider) {
    if (!window.confirm(`Remove your ${provider} API key?`)) return;
    setBusy(true);
    try {
      await deleteMyIntegration({ data: { provider } });
      await refresh();
      setStatus(`${provider} key removed.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <KeyRound size={19} /> Bring Your Own API Keys
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Connect only the services you use. Credentials are encrypted on the server and tied to
          your authenticated account.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((p) => {
          const cred = connected.find((c) => c.provider === p.id);
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex justify-between gap-2 items-center">
                <strong className="text-sm">{p.label}</strong>
                {cred && <CheckCircle2 size={15} className="text-primary" />}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{p.purpose}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {cred ? `Key stored (${cred.key_hint})` : "No personal key saved"} · {p.state}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(p.id);
                    setSecret("");
                    setAck(false);
                  }}
                >
                  {" "}
                  {cred ? "Replace key" : "Configure"}
                </Button>
                {cred && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => remove(p.id)}
                    disabled={busy}
                  >
                    <Trash2 size={12} /> Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-border bg-card p-5 space-y-3 max-w-xl">
        <h3 className="text-xs font-bold text-primary uppercase">
          Configure {PROVIDERS.find((p) => p.id === editing)?.label}
        </h3>
        <label className="block text-xs text-muted-foreground">
          API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Paste provider key"
            className="mt-1 w-full"
          />
        </label>
        <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5"
          />
          I authorize use of this key for requested jobs and understand provider usage may incur
          charges under my own account.
        </label>
        <Button onClick={save} disabled={!userEmail || busy || secret.trim().length < 8 || !ack}>
          <KeyRound size={13} /> {busy ? "Saving…" : "Save API key"}
        </Button>
        {!userEmail && (
          <p className="text-xs text-muted-foreground">Sign in to configure provider keys.</p>
        )}
        {status && (
          <p className="text-xs text-muted-foreground" role="status">
            {status}
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Required deployment setup: INTEGRATION_VAULT_KEY and Supabase service-role environment
        variable. API keys never belong in frontend environment variables or distributable ZIPs.
      </p>
    </div>
  );
}
