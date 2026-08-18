import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const validatorPath = resolve(
  process.cwd(),
  "scripts/validate-client-secret-boundary.mjs",
);
const temporaryDirectories: string[] = [];

async function createRepositoryFixture(files: Record<string, string>) {
  const directory = await mkdtemp(join(tmpdir(), "mithaq-secret-boundary-"));
  temporaryDirectories.push(directory);
  const contractPath = join(directory, "ops/release-contract.json");
  await mkdir(dirname(contractPath), { recursive: true });
  await writeFile(
    contractPath,
    JSON.stringify({
      environments: {
        preview: { serverSecrets: ["SUPABASE_SERVICE_ROLE_KEY"] },
        staging: { serverSecrets: ["SUPABASE_SERVICE_ROLE_KEY"] },
        production: { serverSecrets: ["SUPABASE_SERVICE_ROLE_KEY"] },
      },
    }),
    "utf8",
  );

  for (const [relativePath, source] of Object.entries(files)) {
    const path = join(directory, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source, "utf8");
  }

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

describe("client secret boundary validator", () => {
  it("allows server-only secret usage outside client-visible modules", async () => {
    const directory = await createRepositoryFixture({
      "apps/mobile/src/example.ts":
        'const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;\n',
      "src/server/maintenance.ts":
        'const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n',
      "public/config.json": '{"environment":"preview"}\n',
    });
    const result = runValidator(directory);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Client secret boundary valid");
  });

  it("rejects service-role references in the mobile tree", async () => {
    const directory = await createRepositoryFixture({
      "apps/mobile/src/unsafe.ts":
        'const key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n',
    });
    const result = runValidator(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/mobile/src/unsafe.ts");
    expect(result.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("rejects server-only credentials in Next client modules", async () => {
    const directory = await createRepositoryFixture({
      "src/components/unsafe.tsx": [
        '"use client";',
        'const token = process.env.SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN;',
      ].join("\n"),
    });
    const result = runValidator(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/components/unsafe.tsx");
    expect(result.stderr).toContain("SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN");
  });

  it("rejects server-only configuration in public static assets", async () => {
    const directory = await createRepositoryFixture({
      "public/runtime.json": '{"database":"DATABASE_URL"}\n',
    });
    const result = runValidator(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("public/runtime.json");
    expect(result.stderr).toContain("DATABASE_URL");
  });
});
