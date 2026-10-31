import { describe, it, expect, vi } from "vitest";
import { researchCompanyWithEvidence } from "../../src/lib/intelligence/research-company.server";

describe("Evidence-based AI company researcher", () => {
  const pages = [
    { url: "https://company.example/about", title: "About", content: "Alice is CEO." },
  ];
  it("keeps only source-cited people and strips generated personal contact details", async () => {
    vi.stubEnv("GROQ_API_KEY", "test");
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                business: { name: "Wrong name" },
                people: [
                  {
                    name: "Alice",
                    role: "CEO",
                    email: "invented@example.com",
                    source_urls: [pages[0].url],
                    evidence: ["CEO on About"],
                  },
                  {
                    name: "Bob",
                    role: "CFO",
                    email: "bob@fake",
                    source_urls: ["https://forged.example"],
                    evidence: [],
                  },
                ],
                public_contacts: [],
                research_notes: [],
                uncertainties: [],
              }),
            },
          },
        ],
      }),
    });
    const out = await researchCompanyWithEvidence(
      { provider: "groq", company: "Correct Co", country: "GB", pages },
      fetcher,
    );
    expect(out.business.name).toBe("Correct Co");
    expect(out.people).toHaveLength(1);
    expect(out.people[0]?.email).toBeNull();
    vi.unstubAllEnvs();
  });
  it("supports Gemini JSON with API credentials held in a header", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    business: { name: "Test" },
                    people: [],
                    public_contacts: [],
                    research_notes: ["Official page available"],
                    uncertainties: [],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    const out = await researchCompanyWithEvidence(
      { provider: "gemini", company: "Correct Co", country: "GB", pages },
      fetcher,
    );
    expect(out.research_notes).toHaveLength(1);
    expect(fetcher.mock.calls[0]?.[1].headers["x-goog-api-key"]).toBe("test");
    vi.unstubAllEnvs();
  });
  it("refuses research without verified pages", async () => {
    await expect(
      researchCompanyWithEvidence({ provider: "groq", company: "X", country: "GB", pages: [] }),
    ).rejects.toThrow("Crawl");
  });
});
