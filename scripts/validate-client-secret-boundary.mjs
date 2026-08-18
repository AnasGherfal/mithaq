import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), process.argv[2] ?? ".");
const contract = JSON.parse(
  await readFile(resolve(repositoryRoot, "ops/release-contract.json"), "utf8"),
);
const forbiddenIdentifiers = [
  ...new Set([
    ...Object.values(contract.environments ?? {}).flatMap(
      (environment) => environment.serverSecrets ?? [],
    ),
    "SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "DATABASE_URL",
  ]),
];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);
const skippedNames = new Set([
  "node_modules",
  ".next",
  ".expo",
  "package-lock.json",
]);
const clientRoots = ["apps/mobile", "src", "public"];
const errors = [];
let scannedFiles = 0;

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      Reflect.get(error, "code") === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (skippedNames.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function isClientVisible(relativePath, source) {
  if (relativePath.startsWith("apps/mobile/")) return true;
  if (relativePath.startsWith("public/")) return true;
  if (relativePath === "src/lib/supabase/client.ts") return true;
  if (!relativePath.startsWith("src/")) return false;
  return /^\s*["']use client["'];?/.test(source);
}

for (const root of clientRoots) {
  for (const path of await walk(resolve(repositoryRoot, root))) {
    const relativePath = relative(repositoryRoot, path).replaceAll("\\", "/");
    const source = await readFile(path, "utf8");
    if (!isClientVisible(relativePath, source)) continue;

    scannedFiles += 1;
    for (const identifier of forbiddenIdentifiers) {
      if (source.includes(identifier)) {
        errors.push(
          `${relativePath} references server-only identifier ${identifier}`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Client secret boundary validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Client secret boundary valid: ${scannedFiles} client-visible files scanned; ${forbiddenIdentifiers.length} server-only identifiers protected.`,
);
