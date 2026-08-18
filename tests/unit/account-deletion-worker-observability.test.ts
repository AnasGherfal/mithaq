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

    expect(source).toContain("function logOperationalError(code: string)");
    expect(source).toContain('logOperationalError("claim_failed")');
    expect(source).toContain('logOperationalError("auth_delete_failed")');
    expect(source).not.toContain(".message");
    expect(source).not.toMatch(/console\.error\([\s\S]*?item\.(?:request_id|user_id)/);
    expect(source).not.toMatch(/logOperationalError\([^"']/);
  });
});
