export type Evidence = {
  source_url?: string;
  evidence: string;
  confidence: "high" | "medium" | "low" | "unknown";
  retrieved_at?: string;
};

export type NormalizedBusiness = {
  business_name: string;
  country_code: string;
  region_code: string;
  registration_id: string;
  registry_source: string;
  registry_url?: string;
  raw_source_id: string;
  source_data: Record<string, unknown>;
};

export type ResearchPerson = {
  name: string;
  role: string;
  relationship?: string;
  email?: string | null;
  phone?: string | null;
  source_urls: string[];
  evidence: string[];
};

export type ResearchResult = {
  business: { name: string; website?: string | null; industry?: string | null };
  people: ResearchPerson[];
  public_contacts: Array<{ kind: string; value: string; source_urls: string[] }>;
  research_notes: string[];
  uncertainties: string[];
};