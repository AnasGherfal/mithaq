import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

type MobileSupabaseConfigInput = {
  url: string | undefined;
  publishableKey: string | undefined;
  allowInsecureLocal: boolean;
};

type MobileSupabaseConfig = {
  readonly url: string;
  readonly publishableKey: string;
};

type ValidateMobileSupabaseConfig = (input: MobileSupabaseConfigInput) => MobileSupabaseConfig;

async function loadValidator(): Promise<ValidateMobileSupabaseConfig> {
  const sourcePath = resolve(process.cwd(), "apps/mobile/src/lib/runtime-config.ts");
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  const loaded = (await import(moduleUrl)) as {
    validateMobileSupabaseConfig: ValidateMobileSupabaseConfig;
  };

  return loaded.validateMobileSupabaseConfig;
}

describe("mobile Supabase runtime configuration", () => {
  it("allows the local Supabase URL only in development", async () => {
    const validateMobileSupabaseConfig = await loadValidator();

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

  it("requires HTTPS and a non-loopback host outside development", async () => {
    const validateMobileSupabaseConfig = await loadValidator();

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

  it("rejects missing, malformed, and secret client configuration", async () => {
    const validateMobileSupabaseConfig = await loadValidator();

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
