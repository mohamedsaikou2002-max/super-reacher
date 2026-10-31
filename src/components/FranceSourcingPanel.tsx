import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { searchAndStoreFranceBusinesses } from "@/lib/intelligence/france-sourcing.functions";
import { curateFranceRawBusinesses } from "@/lib/intelligence/france-curation.functions";

type SavedRecord = {
  id: string;
  business_name: string;
  country_code: string;
  industry: string;
  address: string;
  source_record_id: string;
  fetched_at: string;
};

export function FranceSourcingPanel({ userEmail }: { userEmail: string | null }) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [curating, setCurating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await searchAndStoreFranceBusinesses({ data: { query } });
      setRecords(result.records as SavedRecord[]);
      setMessage(
        `France company search returned ${result.found} record${result.found === 1 ? "" : "s"}; ${result.inserted} saved to raw_businesses.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "France registry search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function curate() {
    if (curating || query.trim().length < 2) return;
    setCurating(true);
    setMessage("");
    try {
      const result = await curateFranceRawBusinesses({ data: { query, limit: 25 } });
      setMessage(
        `Stage 2 reviewed ${result.examined} raw records: ${result.curated} curated, ${result.rejected} rejected. ${result.examined > 0 ? "Low confidence matches remain in review." : "Search and save businesses first."}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "France lead curation failed.");
    } finally {
      setCurating(false);
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-foreground">Stage 1 · France business sourcing</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Search the open French company API by business name. Results are saved as raw records and
          are not curated or enriched.
        </p>
        {!userEmail && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            An authenticated workspace session is required for registry imports.
          </p>
        )}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={submit}>
        <input
          className="h-9 min-w-56 flex-1 text-xs"
          aria-label="France business name"
          placeholder="Business name"
          minLength={2}
          maxLength={120}
          required
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={loading || query.trim().length < 2 || !userEmail}>
          {loading ? "Searching…" : "Search and save"}
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Stage 2 · Groq curation</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={curate}
          disabled={curating || query.trim().length < 2 || !userEmail}
        >
          {curating ? "Curating…" : "Curate recent France records"}
        </Button>
      </div>
      {message && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {records.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="p-2">Business</th>
                <th className="p-2">SIREN</th>
                <th className="p-2">Industry</th>
                <th className="p-2">Address</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-border">
                  <td className="p-2 font-medium text-foreground">{record.business_name}</td>
                  <td className="p-2 font-mono">{record.source_record_id}</td>
                  <td className="p-2">{record.industry || "—"}</td>
                  <td className="p-2">{record.address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
