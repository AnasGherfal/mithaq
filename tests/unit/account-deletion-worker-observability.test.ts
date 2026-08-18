import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = resolve(
  process.cwd(),
  "supabase/functions/account-deletion-worker/index.ts",
);

describe("account deletion worker observability", () => {
  it("uses bounded operational codes instead of raw provider errors or member identifiers", async () => {
    const source = await readFile(workerPath, "utf8");
    const consoleErrorSites = source.match(/console\.error\(/g) ?? [];
    const operationalArguments = [
      ...source.matchAll(/logOperationalError\(([^)]*)\)/g),
    ]
      .map((match) => match[1]?.trim() ?? "")
      .filter((argument) => argument !== "code: string");

    expect(source).toContain("function logOperationalError(code: string)");
    expect(source).toContain('logOperationalError("claim_failed")');
    expect(source).toContain('logOperationalError("auth_delete_failed")');
    expect(source).not.toContain(".message");
    expect(consoleErrorSites).toHaveLength(1);
    expect(operationalArguments.length).toBeGreaterThan(0);
    expect(
      operationalArguments.every((argument) => /^"[a-z0-9_]+"$/.test(argument)),
    ).toBe(true);
  });
});
