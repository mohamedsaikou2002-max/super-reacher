/** France's public company search adapter. Despite the legacy filename, this
 * calls the open API Recherche d'entreprises; it does not require an INSEE key.
 */
export type RawFranceBusiness = {
  business_name: string;
  country_code: "FR";
  industry: string;
  address: string;
  source: "api";
  raw_source_url: string;
  source_record_id: string;
  raw_payload: Record<string, unknown>;
  fetched_at: string;
};

const API_URL = "https://recherche-entreprises.api.gouv.fr/search";

function nonEmpty(...values: unknown[]): string {
  return (
    values
      .find((value) => typeof value === "string" && value.trim())
      ?.toString()
      .trim() ?? ""
  );
}

export function mapFrenchCompany(
  record: Record<string, any>,
  fetchedAt = new Date().toISOString(),
): RawFranceBusiness | null {
  const headquarters = record["siege"] ?? {};
  const id = nonEmpty(record["siren"], headquarters.siret);
  const name = nonEmpty(record["nom_complet"], record["nom_raison_sociale"]);
  if (!id || !name) return null;
  return {
    business_name: name,
    country_code: "FR",
    industry: nonEmpty(record["activite_principale"], record["section_activite_principale"]),
    address: nonEmpty(headquarters.adresse),
    source: "api",
    raw_source_url: API_URL,
    source_record_id: id,
    raw_payload: record,
    fetched_at: fetchedAt,
  };
}

export async function searchFranceCompanies(
  query: string,
  options: { fetcher?: typeof fetch; limit?: number } = {},
): Promise<RawFranceBusiness[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2 || normalizedQuery.length > 120)
    throw new Error("Enter a business name with 2 to 120 characters.");
  const url = new URL(API_URL);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("per_page", String(Math.min(25, Math.max(1, options.limit ?? 20))));
  url.searchParams.set("page", "1");
  const response = await (options.fetcher ?? fetch)(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HyperReacher/1.0 (France business sourcing)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    throw new Error(
      response.status === 429
        ? `France company search is rate-limited${retryAfter ? `; retry after ${retryAfter} seconds` : ""}.`
        : `France company search failed (${response.status}).`,
    );
  }
  const body = (await response.json()) as { results?: Array<Record<string, any>> };
  const fetchedAt = new Date().toISOString();
  return (body.results ?? [])
    .map((row) => mapFrenchCompany(row, fetchedAt))
    .filter((row): row is RawFranceBusiness => row !== null);
}

/** Kept as an alias for callers written against the earlier INSEE adapter. */
export const searchFranceSirene = searchFranceCompanies;
