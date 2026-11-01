import { useState, type FormEvent } from "react";
import { askSourcingAssistant } from "@/lib/intelligence/sourcing-assistant.functions";
import { GlobalRegistryPanel } from "@/components/GlobalRegistryPanel";

type Exchange = { question: string; answer: string; citations: string[] };
export function SourceResearchChat({ userEmail }: { userEmail: string | null }) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("global");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !userEmail || query.trim().length < 5) return;
    const question = query.trim();
    setBusy(true);
    setError("");
    try {
      const result = await askSourcingAssistant({ data: { query: question, market } });
      setHistory((h) => [{ question, answer: result.answer, citations: result.citations }, ...h].slice(0, 12));
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research request failed.");
    } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold">AI sourcing assistant · Grok</h3>
        <p className="my-2 text-xs text-muted-foreground">
          Ask about financial institutions, buyers, industry categories, regional registries, or investment mandates. Grok web research is separate from verified registry imports. Findings are not automatically turned into contact details or outbound campaigns.
        </p>
        <form onSubmit={ask} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="text-xs">Market
              <select className="ml-2" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="global">Global</option><option value="US">United States</option>
                <option value="FR">France</option><option value="DE">Germany</option>
                <option value="GB">United Kingdom</option><option value="IT">Italy</option>
                <option value="CA">Canada</option><option value="SG">Singapore</option>
              </select>
            </label>
          </div>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)}
            className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm"
            placeholder="Find asset-management firms in France serving institutional clients. Include evidence and official registry references."
            maxLength={1200} />
          <button type="submit" disabled={!userEmail || busy || query.trim().length < 5}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Researching…" : "Research with Grok"}
          </button>
          {!userEmail && <p className="text-xs text-muted-foreground">Sign in to use your server-side Grok key.</p>}
        </form>
        {error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}
        <div className="mt-4 space-y-3">
          {history.map((item, i) => (
            <article key={i} className="rounded-md border border-border p-3">
              <div className="mb-2 text-xs font-semibold">{item.question}</div>
              <div className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{item.answer}</div>
              {item.citations.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                {item.citations.map((url, j) => <a key={url} href={url} target="_blank"
                  rel="noreferrer" className="text-xs text-primary underline">Source {j + 1}</a>)}
              </div>}
            </article>
          ))}
        </div>
      </section>
      <GlobalRegistryPanel userEmail={userEmail} />
    </div>
  );
}
