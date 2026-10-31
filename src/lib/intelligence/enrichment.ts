import type { EnrichmentProvider } from "./providers";
import { researchFetch } from "./research-client";

export class ApolloEnrichmentProvider implements EnrichmentProvider {
  readonly name = "apollo";
  constructor(private readonly customerKey?: string) {}

  async findProfessionalContact(input: { fullName: string; companyName: string }) {
    const apiKey = this.customerKey || process.env["APOLLO_API_KEY"];
    if (!apiKey) {
      throw new Error("APOLLO_API_KEY is not configured.");
    }

    // Since it's an API, it bypasses Tor due to FORBIDDEN_TOR_DOMAINS in research-client,
    // but we can still use normal fetch directly or researchFetch.
    const res = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        first_name: input.fullName.split(" ")[0],
        last_name: input.fullName.split(" ").slice(1).join(" "),
        organization_name: input.companyName,
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const person = data.person;
    if (!person) {
      return null;
    }

    return {
      name: person.name || input.fullName,
      role: person.title || "unknown",
      email: person.email,
      phone: person.sanitized_phone || null,
      providerRecordId: person.id,
      confidence: (person.email_status === "verified" ? "high" : "medium") as "high" | "medium",
    };
  }

  async verifyContact(input: {
    email?: string;
    phone?: string;
  }): Promise<"verified" | "invalid" | "unknown"> {
    // Apollo doesn't have a standalone verify endpoint for ad-hoc emails,
    // but assuming optimistic verify or unknown if not implemented.
    return "unknown";
  }
}

export class HunterEnrichmentProvider implements EnrichmentProvider {
  readonly name = "hunter";
  constructor(private readonly customerKey?: string) {}

  async findProfessionalContact(input: { fullName: string; companyName: string }) {
    const apiKey = this.customerKey || process.env["HUNTER_API_KEY"];
    if (!apiKey) {
      throw new Error("HUNTER_API_KEY is not configured.");
    }

    // Use Email Finder API
    const url = new URL("https://api.hunter.io/v2/email-finder");
    url.searchParams.append("company", input.companyName);
    url.searchParams.append("full_name", input.fullName);
    url.searchParams.append("api_key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const email = data.data?.email;
    if (!email) {
      return null;
    }

    return {
      name: input.fullName,
      role: data.data?.position || "unknown",
      email: email,
      phone: data.data?.phone_number || null,
      confidence: (data.data?.score > 80 ? "high" : "medium") as "high" | "medium",
    };
  }

  async verifyContact(input: {
    email?: string;
    phone?: string;
  }): Promise<"verified" | "invalid" | "unknown"> {
    if (!input.email) return "unknown";

    const apiKey = this.customerKey || process.env["HUNTER_API_KEY"];
    if (!apiKey) {
      return "unknown";
    }

    const url = new URL("https://api.hunter.io/v2/email-verifier");
    url.searchParams.append("email", input.email);
    url.searchParams.append("api_key", apiKey);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return "unknown";

      const data = await res.json();
      const status = data.data?.status;
      if (status === "valid") return "verified";
      if (status === "invalid") return "invalid";
      return "unknown";
    } catch {
      return "unknown";
    }
  }
}
