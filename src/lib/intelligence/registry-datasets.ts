/** Strict, source-attributed adapters for legitimately obtained national registry exports.
 * Importing a company is NOT evidence that marketing to its contacts is permitted.
 * Keep business registration numbers as strings (leading zeros are meaningful).
 */
export const REGISTRY_COUNTRIES = ["FR", "GB", "SG", "IT", "DE", "CA", "US"] as const;
export type RegistryCountry = (typeof REGISTRY_COUNTRIES)[number];
export type RegistryRecord = {
  business_name: string;
  country_code: RegistryCountry;
  industry: string;
  address: string;
  source: "api";
  raw_source_url: string;
  source_record_id: string;
  raw_payload: Record<string, unknown>;
  fetched_at: string;
};
const columns: Record<RegistryCountry, { id: string[]; name: string[]; industry: string[]; address: string[]; status: string[] }> = {
  FR: { id: ["siren", "siret", "identifiant"], name: ["nom_complet", "denomination", "nom_raison_sociale", "name"], industry: ["activite_principale", "code_ape", "naf"], address: ["adresse", "adresse_siege"], status: ["etat_administratif", "etat_administratif_unite_legale"] },
  GB: { id: ["company_number", "company_no"], name: ["company_name", "companyname"], industry: ["sic_codes", "sic_code"], address: ["regaddress.addressline1", "registered_office_address", "address"], status: ["company_status"] },
  SG: { id: ["uen"], name: ["entity_name"], industry: ["primary_ssic_code", "primary_ssic_description"], address: ["street_name", "registered_office_address"], status: ["entity_status_description", "entity_status"] },
  IT: { id: ["codice_fiscale", "codicefiscale", "rea", "numero_rea", "registration_id"], name: ["denominazione", "ragione_sociale", "name"], industry: ["ateco", "codice_ateco", "attivita"], address: ["indirizzo", "sede_legale"], status: ["stato_attivita", "status"] },
  DE: { id: ["register_number", "registernummer", "registergericht", "unternehmensnummer"], name: ["name", "firma", "unternehmen"], industry: ["wz_code", "wz2008", "branche"], address: ["anschrift", "sitz"], status: ["status"] },
  CA: { id: ["corporation_number", "corporation_no", "corporation_id", "id"], name: ["corporation_name", "legal_name", "name"], industry: ["naics", "naics_code", "industry"], address: ["registered_office_address", "address"], status: ["corporation_status", "status"] },
  US: { id: ["entity_id", "file_number", "registration_number", "company_number", "cik"], name: ["entity_name", "business_name", "company_name", "name"], industry: ["naics", "sic", "industry"], address: ["principal_address", "address"], status: ["status"] },
};
function stringField(row: Record<string, unknown>, candidates: string[]): string {
  const lowercase = new Map(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const field of candidates) {
    const value = lowercase.get(field);
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
    }
    if (Array.isArray(value) && value.length) return value.map(String).join(", ");
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const addr = [nested["address_line_1"], nested["locality"], nested["postal_code"]].filter(Boolean).join(", ");
      if (addr) return addr;
    }
  }
  return "";
}
export function mapRegistryRow(
  country: RegistryCountry,
  row: Record<string, unknown>,
  provenance: { sourceUrl: string; fetchedAt?: string; jurisdiction?: string },
): RegistryRecord | null {
  if (!/^https:\/\//.test(provenance.sourceUrl)) throw new Error("Registry provenance must be an HTTPS URL.");
  const fields = columns[country];
  const id = stringField(row, fields.id);
  const name = stringField(row, fields.name);
  if (!id || !name) return null;
  // US filings are state-specific; identical entity numbers can occur in different states.
  if (country === "US" && !/^[A-Z]{2}$/.test(provenance.jurisdiction ?? "")) {
    throw new Error("US registry imports require a two-letter state jurisdiction.");
  }
  const court = country === "DE" ? stringField(row, ["registergericht", "register_court"]) : "";
  const scopedId = court && !id.startsWith(court) ? `${court}:${id}` : id;
  const sourceRecordId = country === "US" ? `${provenance.jurisdiction}:${id}` : scopedId;
  return {
    business_name: name.slice(0, 500), country_code: country,
    industry: stringField(row, fields.industry).slice(0, 500),
    address: stringField(row, fields.address).slice(0, 1000),
    source: "api", raw_source_url: provenance.sourceUrl,
    source_record_id: sourceRecordId,
    raw_payload: { ...row, _registry_status: stringField(row, fields.status), _jurisdiction: provenance.jurisdiction ?? null },
    fetched_at: provenance.fetchedAt ?? new Date().toISOString(),
  };
}
export function parseRegistryCsv(csv: string): Array<Record<string, string>> {
  const lines: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (quoted || cell.length === 0) quoted = !quoted;
      else cell += ch;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      row.push(cell); if (row.some((x) => x.trim())) lines.push(row);
      row = []; cell = ""; if (ch === "\r" && input[i + 1] === "\n") i += 1;
    } else cell += ch;
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  row.push(cell); if (row.some((x) => x.trim())) lines.push(row);
  const header = lines.shift()?.map((s) => s.trim().toLowerCase()) ?? [];
  if (new Set(header).size !== header.length) throw new Error("Duplicate CSV headers.");
  return lines.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""])));
}
export const REGISTRY_ACCESS: Record<RegistryCountry, { mode: "live_api" | "authorized_bulk_file"; note: string; source: string }> = {
  FR: { mode: "live_api", note: "Name search works; complete national ingestion requires separately authorized Sirene bulk data.", source: "https://recherche-entreprises.api.gouv.fr/" },
  GB: { mode: "live_api", note: "Companies House API key required. Search is bounded and paginated; bulk CSV separately available.", source: "https://developer.company-information.service.gov.uk/" },
  SG: { mode: "authorized_bulk_file", note: "Load published monthly ACRA CSV exports (27 partitions); no unrestricted per-company API implied.", source: "https://data.gov.sg/collections/2/view" },
  IT: { mode: "authorized_bulk_file", note: "Registro Imprese distribution/licensing required. No unsupported search endpoint assumed.", source: "https://www.registroimprese.it/" },
  DE: { mode: "authorized_bulk_file", note: "Registry distribution/licensing or authorized exports required; source portals are not bulk crawler permissions.", source: "https://www.unternehmensregister.de/" },
  CA: { mode: "authorized_bulk_file", note: "Federal Corporations Canada files cover federal entities only; provincial sources are separate.", source: "https://ised-isde.canada.ca/site/corporations-canada/en/data-services" },
  US: { mode: "authorized_bulk_file", note: "State-by-state corporate exports; always provide state code, avoid suggesting one national company registry.", source: "https://www.usa.gov/state-business" },
};
