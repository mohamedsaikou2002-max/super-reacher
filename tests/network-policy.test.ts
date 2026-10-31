import { describe, expect, it } from "vitest";
import {
  parseHostAllowlist,
  trustedEngineEndpoint,
  validateTrustedHttpsUrl,
} from "../src/lib/network-policy";

describe("remote destination policy", () => {
  const hosts = ["engine.example.com", "research.example.org"];
  it("denies all destinations without an operator allowlist", () => {
    expect(() => validateTrustedHttpsUrl("https://engine.example.com/", [])).toThrow(/allowlist/);
  });
  it.each([
    "http://engine.example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost",
    "https://10.0.0.1",
    "https://169.254.169.254",
    "https://evil.example.com",
    "https://user:pass@engine.example.com",
    "https://engine.example.com:8000",
  ])("denies unsafe engine targets: %s", (input) => {
    expect(() => validateTrustedHttpsUrl(input, hosts)).toThrow();
  });
  it("rejects user-specified path when creating engine endpoints", () => {
    expect(() =>
      trustedEngineEndpoint("https://engine.example.com/private", "/api/health", hosts),
    ).toThrow(/base URL/);
  });
  it("accepts exact trusted HTTPS hosts and fixed API paths", () => {
    expect(trustedEngineEndpoint("https://engine.example.com", "/api/health", hosts)).toBe(
      "https://engine.example.com/api/health",
    );
  });
  it("rejects DNS suffix tricks in the allowlist", () => {
    expect(
      parseHostAllowlist("localhost,127.0.0.1,engine.example.com,example.local").join(","),
    ).toBe("engine.example.com");
  });
});
