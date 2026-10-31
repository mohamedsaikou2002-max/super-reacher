import type { NormalizedBusiness, ResearchResult } from "./types";

export type RegistrySearch = { query: string; country_code: string; region_code?: string };

export interface RegistryProvider {
  readonly countryCode: string;
  searchBusinesses(input: RegistrySearch): Promise<NormalizedBusiness[]>;
  getBusiness(sourceId: string): Promise<NormalizedBusiness | null>;
}

export interface ResearchProvider {
  readonly name: "gemini" | "grok" | string;
  researchBusiness(input: {
    businessName: string;
    countryCode: string;
    regionCode?: string;
    officialWebsite?: string;
    sourceUrls: string[];
  }): Promise<ResearchResult>;
}

export interface EnrichmentProvider {
  readonly name: string;
  findProfessionalContact(input: { fullName: string; companyName: string }): Promise<{
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
    providerRecordId?: string;
    confidence: "high" | "medium" | "low" | "unknown";
  } | null>;
  verifyContact(input: {
    email?: string;
    phone?: string;
  }): Promise<"verified" | "invalid" | "unknown">;
}

export interface MessagingProvider {
  readonly name: string;
  sendEmail(input: { to: string; subject: string; html: string }): Promise<{ providerId: string }>;
  sendSms(input: { to: string; body: string }): Promise<{ providerId: string }>;
}
