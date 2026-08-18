import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const validatorPath = resolve(
  process.cwd(),
  "scripts/validate-staging-preflight.mjs",
);

function runPreflight(overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, [validatorPath, "staging"], {
    encoding: "utf8",
    env: {
      ...process.env,
      APP_ENV: "staging",
      NEXT_PUBLIC_SITE_URL: "https://staging.mithaq.app",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      MITHAQ_CONVERSATION_RETENTION_DAYS: "30",
      MITHAQ_NOTIFICATION_RETENTION_DAYS: "30",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-placeholder",
      ...overrides,
    },
  });
}

describe("hosted environment preflight", () => {
  it("accepts a consistent hosted staging environment", () => {
    const result = runPreflight();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Hosted staging preflight valid");
  });

  it("rejects localhost Supabase URLs", () => {
    const result = runPreflight({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must use https");
    expect(result.stderr).toContain("must not point to localhost");
  });

  it("rejects a client-visible secret key", () => {
    const result = runPreflight({
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_unsafe",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("never a secret/service-role key");
  });

  it("rejects web and mobile environments that target different backends", () => {
    const result = runPreflight({
      EXPO_PUBLIC_SUPABASE_URL: "https://other.supabase.co",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must target the same Supabase project");
  });

  it("requires explicit positive retention policy values", () => {
    const result = runPreflight({
      MITHAQ_CONVERSATION_RETENTION_DAYS: "0",
      MITHAQ_NOTIFICATION_RETENTION_DAYS: "not-a-number",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "MITHAQ_CONVERSATION_RETENTION_DAYS must be a positive integer number of days",
    );
    expect(result.stderr).toContain(
      "MITHAQ_NOTIFICATION_RETENTION_DAYS must be a positive integer number of days",
    );
  });
});
