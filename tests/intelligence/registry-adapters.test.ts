import { describe, expect, it, vi } from "vitest";
import {
  mapRegistryRow,
  parseRegistryCsv,
  REGISTRY_ACCESS,
} from "../../src/lib/intelligence/registry-datasets";
import { searchLiveRegistry } from "../../src/lib/intelligence/registry-adapters.server";

describe("national registry import adapters", () => {
  it("parses escaped commas, quotes, CRLF and BOM safely", () => {
    const rows = parseRegistryCsv(
      '\uFEFFuen,entity_name,primary_ssic_code\r\n123,"Acme, ""Works""",62010\r\n',
    );
    expect(rows).toEqual([
      { uen: "123", entity_name: 'Acme, "Works"', primary_ssic_code: "62010" },
    ]);
  });
  it("rejects malformed CSV", () => {
    expect(() => parseRegistryCsv('a,b\n"unterminated,b')).toThrow();
  });
  it.each([
    [
      "SG",
      { uen: "201234567A", entity_name: "Singapore Firm", primary_ssic_code: "62010" },
      "201234567A",
    ],
    [
      "IT",
      { codice_fiscale: "01234567890", denominazione: "Italia SPA", ateco: "62.01" },
      "01234567890",
    ],
    ["DE", { register_number: "HRB 1000", firma: "Berlin GmbH" }, "HRB 1000"],
    ["CA", { corporation_number: "0001234", corporation_name: "Canada Inc" }, "0001234"],
    ["FR", { siren: "000012345", nom_complet: "France SAS" }, "000012345"],
    ["GB", { company_number: "00012345", company_name: "UK LTD" }, "00012345"],
  ] as const)("maps %s while retaining the official ID", (country, row, id) => {
    const mapped = mapRegistryRow(country, row, { sourceUrl: "https://registry.example.org/data" });
    expect(mapped?.source_record_id).toBe(id);
    expect(mapped?.source).toBe("api");
  });
  it("requires US state scoping and source provenance", () => {
    expect(() =>
      mapRegistryRow(
        "US",
        { entity_id: "123", entity_name: "Corp" },
        { sourceUrl: "https://official.example" },
      ),
    ).toThrow();
    const row = mapRegistryRow(
      "US",
      { entity_id: "00123", entity_name: "Corp" },
      { sourceUrl: "https://official.example", jurisdiction: "MD" },
    );
    expect(row?.source_record_id).toBe("MD:00123");
    expect(() => mapRegistryRow("FR", {}, { sourceUrl: "http://untrusted" })).toThrow();
  });
  it("never pretends file-based sources offer live APIs", () => {
    expect(REGISTRY_ACCESS.SG.mode).toBe("authorized_bulk_file");
    expect(REGISTRY_ACCESS.IT.mode).toBe("authorized_bulk_file");
  });
});
describe("Companies House integration with mocked HTTP", () => {
  it("uses Basic API auth, SIC filters, and maps results", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-example");
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            company_number: "00012345",
            company_name: "Example Ltd",
            company_status: "active",
            sic_codes: ["62012"],
          },
        ],
      }),
    });
    const rows = await searchLiveRegistry(
      { country_code: "GB", query: "Example", industryCode: "62012" },
      request,
    );
    expect(rows[0]?.registration_id).toBe("00012345");
    const url = new URL(String(request.mock.calls[0]?.[0]));
    expect(url.searchParams.get("sic_codes")).toBe("62012");
    expect(request.mock.calls[0]?.[1].headers.Authorization).toMatch(/^Basic /);
    vi.unstubAllEnvs();
  });
});
