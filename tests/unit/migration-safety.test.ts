import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const validatorPath = resolve(
  process.cwd(),
  "scripts/validate-migration-safety.mjs",
);
const temporaryDirectories: string[] = [];

async function createMigrationDirectory(source: string) {
  const directory = await mkdtemp(join(tmpdir(), "mithaq-migration-safety-"));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, "202608180001_test.sql"), source, "utf8");
  return directory;
}

function runValidator(directory: string) {
  return spawnSync(process.execPath, [validatorPath, directory], {
    encoding: "utf8",
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("migration safety validator", () => {
  it("passes additive migrations", async () => {
    const directory = await createMigrationDirectory(
      "create table public.example (id uuid primary key);",
    );
    const result = runValidator(directory);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 migrations scanned");
    expect(result.stdout).toContain(
      "0 explicitly reviewed destructive migration(s)",
    );
  });

  it("fails closed on destructive DDL without a reviewed marker", async () => {
    const directory = await createMigrationDirectory(
      "alter table public.example drop column legacy_value;",
    );
    const result = runValidator(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ALTER TABLE ... DROP COLUMN");
    expect(result.stderr).toContain("MITHAQ-DESTRUCTIVE-MIGRATION-REVIEWED");
  });

  it("permits explicitly reviewed destructive DDL with an auditable reference", async () => {
    const directory = await createMigrationDirectory(
      [
        "-- MITHAQ-DESTRUCTIVE-MIGRATION-REVIEWED: change-review-482",
        "drop table public.legacy_example;",
      ].join("\n"),
    );
    const result = runValidator(directory);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("Reviewed destructive migration");
    expect(result.stderr).toContain("change-review-482");
  });

  it("rejects stale review markers on non-destructive migrations", async () => {
    const directory = await createMigrationDirectory(
      [
        "-- MITHAQ-DESTRUCTIVE-MIGRATION-REVIEWED: change-review-483",
        "create index example_idx on public.example (id);",
      ].join("\n"),
    );
    const result = runValidator(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("contains no guarded destructive DDL");
  });
});
