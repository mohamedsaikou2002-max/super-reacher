import type { ResearchPerson, ResearchResult } from "./types";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function parsePerson(value: unknown): ResearchPerson | null {
  if (!value || typeof value !== "object") return null;
  const person = value as Record<string, unknown>;
  const name = text(person["name"]);
  if (!name) return null;
  return {
    name,
    role: text(person["role"]),
    ...(text(person["relationship"]) ? { relationship: text(person["relationship"]) } : {}),
    email: typeof person["email"] === "string" ? person["email"].trim() || null : null,
    phone: typeof person["phone"] === "string" ? person["phone"].trim() || null : null,
    source_urls: list(person["source_urls"]),
    evidence: list(person["evidence"]),
  };
}

export function parseResearchResult(value: unknown): ResearchResult {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const business = input["business"] && typeof input["business"] === "object" ? input["business"] as Record<string, unknown> : {};
  const people = Array.isArray(input["people"]) ? input["people"].map(parsePerson).filter((person): person is ResearchPerson => person !== null) : [];
  const publicContacts = Array.isArray(input["public_contacts"]) ? input["public_contacts"].flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const contact = item as Record<string, unknown>;
    const kind = text(contact["kind"]);
    const contactValue = text(contact["value"]);
    return kind && contactValue ? [{ kind, value: contactValue, source_urls: list(contact["source_urls"]) }] : [];
  }) : [];
  return {
    business: { name: text(business["name"]), website: text(business["website"]) || null, industry: text(business["industry"]) || null },
    people,
    public_contacts: publicContacts,
    research_notes: list(input["research_notes"]),
    uncertainties: list(input["uncertainties"]),
  };
}

export type ResolvedClaim = { value: string; confidence: "high" | "medium" | "low" | "conflict"; source_urls: string[]; evidence: string[] };

export function resolvePersonRoles(results: ResearchResult[], personName: string): ResolvedClaim | null {
  const claims = results.flatMap((result) => result["people"].filter((person) => person["name"].toLowerCase() === personName.toLowerCase()).map((person) => ({
    value: person["role"] || person["relationship"] || "",
    source_urls: person["source_urls"],
    evidence: person["evidence"],
  }))).filter((claim) => claim["value"]);
  if (!claims.length) return null;
  const values = [...new Set(claims.map((claim) => claim["value"].toLowerCase()))];
  return {
    value: claims[0]?.["value"] ?? "",
    confidence: values.length > 1 ? "conflict" : claims.some((claim) => claim["source_urls"].length > 0) ? "high" : "medium",
    source_urls: [...new Set(claims.flatMap((claim) => claim["source_urls"]))],
    evidence: [...new Set(claims.flatMap((claim) => claim["evidence"]))],
  };
}