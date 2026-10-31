/** Live government registry adapters. Server-only: API credentials must never reach a browser. */
import type { RegistryProvider, RegistrySearch } from "./providers";
import type { NormalizedBusiness } from "./types";
import { mapRegistryRow, REGISTRY_ACCESS, type RegistryCountry } from "./registry-datasets";
import { searchFranceCompanies } from "./insee-france";

export type RegistrySearchOptions = RegistrySearch & {
  limit?: number;
  industryCode?: string;
  startIndex?: number;
};
export type LiveRegistryCountry = "FR" | "GB";
type Fetcher = typeof fetch;

function normalized(record: NonNullable<ReturnType<typeof mapRegistryRow>>): NormalizedBusiness {
  return {
    business_name: record.business_name,
    country_code: record.country_code,
    region_code: String(record.raw_payload["_jurisdiction"] ?? ""),
    registration_id: record.source_record_id,
    registry_source:
      record.country_code === "GB" ? "companies-house" : "france-open-company-search",
    registry_url: record.raw_source_url,
    raw_source_id: record.source_record_id,
    source_data: record.raw_payload,
  };
}
export async function searchLiveRegistry(
  input: RegistrySearchOptions,
  fetcher: Fetcher = fetch,
): Promise<NormalizedBusiness[]> {
  const country = input.country_code.toUpperCase();
  if (country !== "FR" && country !== "GB")
    throw new Error(
      `${country}: ${REGISTRY_ACCESS[country as RegistryCountry]?.note ?? "No live adapter configured. Import a licensed dataset."}`,
    );
  const query = input.query.trim();
  if ((! (country === "GB" && query === "*" && input.industryCode) && query.length < 2) || query.length > 120) throw new Error("Query must be 2–120 characters.");
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  if (country === "FR") {
    const rows = await searchFranceCompanies(query, { fetcher, limit: Math.min(limit, 25) });
    return rows.map((row) =>
      normalized({
        ...row,
        raw_payload: row.raw_payload,
      }),
    );
  }
  const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
  if (!apiKey) throw new Error("COMPANIES_HOUSE_API_KEY is not configured.");
  const url = new URL("https://api.company-information.service.gov.uk/advanced-search/companies");
  if (input.industryCode) {
    if (!/^\d{5}$/.test(input.industryCode))
      throw new Error("UK SIC codes must contain exactly five digits.");
    url.searchParams.set("sic_codes", input.industryCode);
  }
  if (query !== "*") url.searchParams.set("company_name_includes", query);
  url.searchParams.set("size", String(limit));
  url.searchParams.set("start_index", String(Math.min(Math.max(input.startIndex ?? 0, 0), 100000)));
  const response = await fetcher(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!response.ok) {
    if (response.status === 429)
      throw new Error(
        "Companies House rate limit reached; retry after the provider's indicated delay.",
      );
    throw new Error(`Companies House API failed with HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as { items?: Array<Record<string, unknown>> };
  return (payload.items ?? []).flatMap((row) => {
    const entry = mapRegistryRow("GB", row, {
      sourceUrl: "https://api.company-information.service.gov.uk/advanced-search/companies",
    });
    return entry ? [normalized(entry)] : [];
  });
}
export function getLiveRegistryProvider(
  countryCode: LiveRegistryCountry,
  fetcher?: Fetcher,
): RegistryProvider {
  return {
    countryCode,
    async searchBusinesses(input: RegistrySearch) {
      return searchLiveRegistry({ ...input, country_code: countryCode }, fetcher);
    },
    async getBusiness(sourceId: string) {
      if (countryCode !== "GB") return null; // French full entity lookup requires a separately implemented API route.
      const key = process.env["COMPANIES_HOUSE_API_KEY"];
      if (!key) throw new Error("COMPANIES_HOUSE_API_KEY is not configured.");
      if (!/^[a-zA-Z0-9]{1,12}$/.test(sourceId)) throw new Error("Invalid company number.");
      const url = `https://api.company-information.service.gov.uk/company/${encodeURIComponent(sourceId)}`;
      const response = await (fetcher ?? fetch)(url, {
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Companies House lookup failed (${response.status}).`);
      const entry = mapRegistryRow("GB", (await response.json()) as Record<string, unknown>, {
        sourceUrl: url,
      });
      return entry ? normalized(entry) : null;
    },
  };
}
