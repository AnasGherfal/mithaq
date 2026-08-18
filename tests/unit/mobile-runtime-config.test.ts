import { describe, expect, it } from "vitest";
import { validateMobileSupabaseConfig } from "../../apps/mobile/src/lib/runtime-config";

describe("mobile Supabase runtime configuration", () => {
  it("allows the local Supabase URL only in development", () => {
    expect(
      validateMobileSupabaseConfig({
        url: "http://127.0.0.1:54321",
        publishableKey: "local-public-key",
        allowInsecureLocal: true,
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-public-key",
    });
  });

  it("requires HTTPS and a non-loopback host outside development", () => {
    expect(() =>
      validateMobileSupabaseConfig({
        url: "http://project.supabase.co",
        publishableKey: "public-key",
        allowInsecureLocal: false,
      }),
    ).toThrow("must use HTTPS");

    expect(() =>
      validateMobileSupabaseConfig({
        url: "https://127.0.0.1:54321",
        publishableKey: "public-key",
        allowInsecureLocal: false,
      }),
    ).toThrow("loopback host");

    expect(
      validateMobileSupabaseConfig({
        url: "https://project.supabase.co",
        publishableKey: "sb_publishable_example",
        allowInsecureLocal: false,
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("rejects missing, malformed, and secret client configuration", () => {
    expect(() =>
      validateMobileSupabaseConfig({
        url: undefined,
        publishableKey: undefined,
        allowInsecureLocal: true,
      }),
    ).toThrow("Missing mobile Supabase public configuration");

    expect(() =>
      validateMobileSupabaseConfig({
        url: "not-a-url",
        publishableKey: "public-key",
        allowInsecureLocal: true,
      }),
    ).toThrow("Invalid mobile Supabase URL");

    expect(() =>
      validateMobileSupabaseConfig({
        url: "https://project.supabase.co",
        publishableKey: "sb_secret_never_ship_this",
        allowInsecureLocal: false,
      }),
    ).toThrow("Secret Supabase keys are forbidden in the mobile client");
  });
});
