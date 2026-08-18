import { describe, expect, it } from "vitest";
import {
  normalizeExpectedRevision,
  validateHealthPayload,
  validateHostedBaseUrl,
  validateHostedHeaders,
  verifyHostedRelease,
} from "../../scripts/verify-hosted-release.mjs";

describe("hosted release verification", () => {
  it("rejects insecure and local hosted targets", () => {
    expect(() => validateHostedBaseUrl("http://staging.example.com")).toThrow(
      /HTTPS/,
    );
    expect(() => validateHostedBaseUrl("https://127.0.0.1:3000")).toThrow(
      /local address/,
    );
    expect(() => validateHostedBaseUrl("not-a-url")).toThrow(
      /valid absolute URL/,
    );
  });

  it("normalizes an expected commit revision", () => {
    expect(normalizeExpectedRevision("ABCDEF1234567890")).toBe("abcdef123456");
    expect(() => normalizeExpectedRevision("release-main")).toThrow(
      /hexadecimal commit SHA/,
    );
  });

  it("detects release identity drift", () => {
    const errors = validateHealthPayload(
      {
        status: "ok",
        application: "Mithaq",
        release: {
          version: "0.1.0",
          tier: "staging",
          revision: "abcdef123456",
        },
      },
      { tier: "production", version: "0.1.0", revision: "abcdef123456" },
    );

    expect(errors).toContain("release tier staging does not match production");
  });

  it("requires the reviewed hosted security-header baseline", () => {
    const headers = new Headers({
      "content-security-policy":
        "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "DENY",
      "permissions-policy":
        "camera=(), microphone=(), geolocation=(), payment=()",
    });

    expect(validateHostedHeaders(headers, "staging")).toEqual([]);
    expect(validateHostedHeaders(headers, "production")).toEqual(
      expect.arrayContaining([
        "production strict-transport-security header is missing or incomplete",
        "production content-security-policy must upgrade insecure requests",
      ]),
    );
  });

  it("verifies health identity and hosted headers without credentials", async () => {
    const calls = [];
    const csp =
      "default-src 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests";
    const secureHeaders = {
      "content-security-policy": csp,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "DENY",
      "permissions-policy":
        "camera=(), microphone=(), geolocation=(), payment=()",
      "strict-transport-security":
        "max-age=63072000; includeSubDomains; preload",
    };

    const fetchImpl = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/api/health")) {
        return Response.json(
          {
            status: "ok",
            application: "Mithaq",
            release: {
              version: "0.1.0",
              tier: "production",
              revision: "abcdef123456",
            },
          },
          { headers: { ...secureHeaders, "cache-control": "no-store" } },
        );
      }
      return new Response("ok", { status: 200, headers: secureHeaders });
    };

    await expect(
      verifyHostedRelease({
        baseUrl: "https://mithaq.example",
        tier: "production",
        revision: "abcdef1234567890",
        fetchImpl,
      }),
    ).resolves.toEqual({
      tier: "production",
      version: "0.1.0",
      revision: "abcdef123456",
      origin: "https://mithaq.example",
    });
    expect(calls).toEqual([
      "https://mithaq.example/api/health",
      "https://mithaq.example/",
    ]);
  });
});
