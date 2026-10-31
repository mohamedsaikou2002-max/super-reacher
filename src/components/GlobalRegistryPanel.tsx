import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import {
  REGISTRY_ACCESS,
  REGISTRY_COUNTRIES,
  type RegistryCountry,
} from "@/lib/intelligence/registry-datasets";
import { searchAndStoreGlobalBusinesses } from "@/lib/intelligence/global-registry.functions";
import { curateGlobalRawBusinesses } from "@/lib/intelligence/global-curation.functions";
type DisplayRecord = {
  id: string;
  business_name: string;
  country_code: string;
  industry: string;
  source_record_id: string;
};
export function GlobalRegistryPanel({ userEmail }: { userEmail: string | null }) {
  const [country, setCountry] = useState<RegistryCountry>("GB");
  const [query, setQuery] = useState("");
  const [industryCode, setIndustryCode] = useState("");
  const [results, setResults] = useState<DisplayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const source = REGISTRY_ACCESS[country];
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || source.mode !== "live_api") return;
    setLoading(true);
    setMessage("");
    try {
      const result = await searchAndStoreGlobalBusinesses({
        data: {
          country: country as "FR" | "GB",
          query,
          ...(country === "GB" && industryCode ? { industryCode } : {}),
          limit: 20,
        },
      });
      setResults(result.records as DisplayRecord[]);
      setMessage(`${result.found} found; ${result.saved} saved as raw businesses for review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registry search failed.");
    } finally {
      setLoading(false);
    }
  }
  async function curate() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await curateGlobalRawBusinesses({
        data: { country, niche: query, limit: 20 },
      });
      setMessage(
        `Groq assessed ${result.examined}: ${result.curated} curated, ${result.review} require review, ${result.rejected} rejected. No outreach enabled automatically.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Groq curation failed.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-bold">Global business registry research</h3>
      <p className="text-xs text-muted-foreground">
        Official-source discovery; imported companies are not automatically approved for marketing.
      </p>
      <form className="flex flex-wrap gap-2 items-end" onSubmit={search}>
        <label className="text-xs">
          Country
          <select
            className="block"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value as RegistryCountry);
              setResults([]);
              setMessage("");
            }}
          >
            {REGISTRY_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs flex-1 min-w-48">
          Target business name / niche
          <input
            className="block w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={120}
            placeholder="Aerospace manufacturers"
          />
        </label>
        {country === "GB" && (
          <label className="text-xs">
            Optional UK SIC code
            <input
              className="block w-28"
              value={industryCode}
              onChange={(e) => setIndustryCode(e.target.value)}
              pattern="[0-9]{5}"
              placeholder="62012"
            />
          </label>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!userEmail || loading || query.trim().length < 2 || source.mode !== "live_api"}
        >
          Search registry
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!userEmail || loading || query.trim().length < 2}
          onClick={curate}
        >
          Curate with Groq
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        {source.note}{" "}
        {source.mode === "authorized_bulk_file"
          ? "Import an authorized CSV using scripts/import_registry.py, then run Groq curation."
          : ""}
      </p>
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {results.length > 0 && (
        <div className="max-h-56 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left">Company</th>
                <th className="text-left">Registry ID</th>
                <th className="text-left">Industry</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td>{r.business_name}</td>
                  <td>{r.source_record_id}</td>
                  <td>{r.industry || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
