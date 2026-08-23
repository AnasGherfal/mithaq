import { existsSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testRoot = resolve(repoRoot, "supabase", "tests", "database");

// These suites describe pre-launch APIs or product spaces that later immutable
// migrations intentionally replaced. Keep them in the repository for historical
// regression work, but do not let retired behavior define the Marriage release
// contract. Newer final-contract suites cover the launch behavior instead.
const supersededTests = new Set([
  "170_controlled_introductions.sql",
  "180_matching_hard_constraints.sql",
  "200_introduction_expiry_cooldowns.sql",
  "210_private_conversations.sql",
  "220_conversation_read_state.sql",
  "230_private_notification_inbox.sql",
  "240_message_idempotency.sql",
  "250_message_pagination_cursor.sql",
  "260_message_rate_limit.sql",
  "354_connection_spaces.sql",
  "355_friendship_discovery_requests.sql",
  "355_marriage_space_bootstrap.sql",
  "356_friendship_connections_hardening.sql",
  "356_friendship_conversations.sql",
  "357_friendship_chat_inbox.sql",
  "363_private_visibility_identity_trust.sql",
]);

const allTests = readdirSync(testRoot)
  .filter((name) => name.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

const releaseTests = allTests.filter((name) => !supersededTests.has(name));
const missingHistoricalTests = [...supersededTests].filter(
  (name) => !allTests.includes(name),
);

if (missingHistoricalTests.length > 0) {
  console.error("Superseded database test registry is stale:");
  for (const name of missingHistoricalTests) console.error(`- ${name}`);
  process.exit(1);
}

if (releaseTests.length === 0) {
  console.error("No release database tests were found.");
  process.exit(1);
}

console.log(
  `Running ${releaseTests.length} Marriage release database test files.`,
);
console.log(
  `Keeping ${supersededTests.size} superseded suites out of the release gate:`,
);
for (const name of [...supersededTests].sort()) console.log(`- ${name}`);
console.log(
  "Run `pnpm test:db:all` when intentionally auditing historical suites.",
);

const relativeTests = releaseTests.map((name) =>
  relative(repoRoot, resolve(testRoot, name)),
);
const pnpmExecPath = process.env.npm_execpath;

if (pnpmExecPath && existsSync(pnpmExecPath)) {
  run(
    process.execPath,
    [pnpmExecPath, "exec", "supabase", "test", "db", ...relativeTests],
    false,
  );
} else {
  const windows = process.platform === "win32";
  run(
    windows ? "pnpm.cmd" : "pnpm",
    ["exec", "supabase", "test", "db", ...relativeTests],
    windows,
  );
}

function run(command, args, shell) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell,
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
