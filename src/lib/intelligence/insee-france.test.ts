import { describe, expect, it, vi } from "vitest";
import { mapFrenchCompany, searchFranceCompanies } from "./insee-france";

describe("France company search normalization", () => {
  it("maps public search results into raw-business rows with source evidence", () => {
    const row = mapFrenchCompany(
      {
        siren: "123456789",
        nom_complet: "Example SAS",
        activite_principale: "62.01Z",
        siege: { siret: "12345678900012", adresse: "10 RUE DE LA PAIX 75002 PARIS" },
      },
      "2026-09-25T12:00:00.000Z",
    );

    expect(row).toMatchObject({
      business_name: "Example SAS",
      country_code: "FR",
      industry: "62.01Z",
      address: "10 RUE DE LA PAIX 75002 PARIS",
      source: "api",
      source_record_id: "123456789",
      fetched_at: "2026-09-25T12:00:00.000Z",
    });
    expect(row?.raw_payload).toHaveProperty("siren", "123456789");
  });

  it("skips records without a company identifier", () => {
    expect(mapFrenchCompany({ nom_complet: "No identifier" })).toBeNull();
  });

  it("calls the open search API without credentials and returns normalized rows", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              siren: "123456789",
              nom_complet: "Example SAS",
              siege: {},
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const rows = await searchFranceCompanies("Example SAS", { fetcher });
    expect(fetcher).toHaveBeenCalledOnce();
    const call = fetcher.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected the API fetcher to be called");
    const [url, init] = call;
    expect(String(url)).toContain("recherche-entreprises.api.gouv.fr/search");
    expect(new URL(String(url)).searchParams.get("q")).toBe("Example SAS");
    expect(new Headers(init?.headers).get("X-INSEE-Api-Key-Integration")).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.business_name).toBe("Example SAS");
  });

  it("rejects invalid queries without making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(searchFranceCompanies("x", { fetcher })).rejects.toThrow("2 to 120 characters");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
