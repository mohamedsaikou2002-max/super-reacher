import { describe, it, expect, vi } from "vitest";
import { curateRegistryBatch } from "../../src/lib/intelligence/groq-curation.server";

describe("Groq registry qualification", () => {
  it("validates source IDs and drops made-up matches", async () => {
    vi.stubEnv("GROQ_API_KEY", "fake-for-test");
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    source_record_id: "A",
                    relevant: true,
                    niche_tag: "Tech",
                    relevance_score: 95,
                    relevance_note: "SIC match",
                  },
                  {
                    source_record_id: "FORGED",
                    relevant: true,
                    niche_tag: "Tech",
                    relevance_score: 100,
                    relevance_note: "Fake",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });
    const result = await curateRegistryBatch(
      "software",
      [
        {
          source_record_id: "A",
          business_name: "Example",
          country_code: "GB",
          industry: "62012",
          address: "",
        },
      ],
      fetcher,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.source_record_id).toBe("A");
    vi.unstubAllEnvs();
  });
  it("rejects excessive batches before invoking the provider", async () => {
    vi.stubEnv("GROQ_API_KEY", "fake-for-test");
    const items = Array.from({ length: 26 }, (_, i) => ({
      source_record_id: String(i),
      business_name: "Test",
      country_code: "GB",
      industry: "",
      address: "",
    }));
    await expect(curateRegistryBatch("technology", items)).rejects.toThrow("Maximum 25");
    vi.unstubAllEnvs();
  });
});
