import type { NormalizedBusiness } from "./types";

export function normalizeBusinessName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function businessIdentityKeys(record: NormalizedBusiness): string[] {
  const name = normalizeBusinessName(record.business_name);
  const keys = [
    record.registration_id && `${record.country_code}:${record.registration_id}`,
    name && `${record.country_code}:${record.region_code}:${name}`,
  ];
  return keys.filter(Boolean);
}

export function deduplicateBusinesses(records: NormalizedBusiness[]): NormalizedBusiness[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const keys = businessIdentityKeys(record);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}
