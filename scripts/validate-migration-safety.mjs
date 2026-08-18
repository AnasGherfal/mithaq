import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migrationDirectory = resolve(
  process.cwd(),
  process.argv[2] ?? "supabase/migrations",
);
const reviewedOverridePattern =
  /^\s*--\s*MITHAQ-DESTRUCTIVE-MIGRATION-REVIEWED:\s*(\S.*)$/im;
const destructiveRules = [
  { label: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { label: "DROP SCHEMA", pattern: /\bdrop\s+schema\b/i },
  { label: "DROP TYPE", pattern: /\bdrop\s+type\b/i },
  { label: "TRUNCATE", pattern: /\btruncate(?:\s+table)?\b/i },
  {
    label: "ALTER TABLE ... DROP COLUMN",
    pattern: /\balter\s+table\b[\s\S]*?\bdrop\s+column\b/i,
  },
];

function stripSqlComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ");
}

const migrationFiles = (await readdir(migrationDirectory))
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort();
const errors = [];
const reviewed = [];

for (const fileName of migrationFiles) {
  const source = await readFile(resolve(migrationDirectory, fileName), "utf8");
  const override = source.match(reviewedOverridePattern)?.[1]?.trim() ?? null;
  const statements = stripSqlComments(source)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const violations = [];

  for (const statement of statements) {
    for (const rule of destructiveRules) {
      if (rule.pattern.test(statement)) violations.push(rule.label);
    }
  }

  const uniqueViolations = [...new Set(violations)];

  if (uniqueViolations.length === 0) {
    if (override) {
      errors.push(
        `${fileName} declares a destructive-migration review override but contains no guarded destructive DDL`,
      );
    }
    continue;
  }

  if (!override || override.length < 5) {
    errors.push(
      `${fileName} contains ${uniqueViolations.join(", ")} without an explicit review marker. Add "-- MITHAQ-DESTRUCTIVE-MIGRATION-REVIEWED: <review reference>" only after backup/rollback review.`,
    );
    continue;
  }

  reviewed.push(`${fileName}: ${uniqueViolations.join(", ")} (${override})`);
}

if (errors.length > 0) {
  console.error("Migration safety validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

for (const entry of reviewed) {
  console.warn(`Reviewed destructive migration: ${entry}`);
}

console.log(
  `Migration safety valid: ${migrationFiles.length} migrations scanned; ${reviewed.length} explicitly reviewed destructive migration(s).`,
);
