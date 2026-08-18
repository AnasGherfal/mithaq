import { readFile } from "node:fs/promises";

const contract = JSON.parse(
  await readFile(
    new URL("../ops/release-contract.json", import.meta.url),
    "utf8",
  ),
);

const errors = [];
const requiredEnvironments = ["preview", "staging", "production"];
const forbiddenPublicFragments = ["SERVICE_ROLE", "SECRET"];
const requiredPublic = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

for (const environmentName of requiredEnvironments) {
  const environment = contract.environments?.[environmentName];

  if (!environment) {
    errors.push(`Missing release environment: ${environmentName}`);
    continue;
  }

  if (environment.appEnv !== environmentName) {
    errors.push(`${environmentName}.appEnv must equal ${environmentName}`);
  }

  const publicVariables = environment.publicVariables ?? [];
  const serverSecrets = environment.serverSecrets ?? [];

  for (const variable of requiredPublic) {
    if (!publicVariables.includes(variable)) {
      errors.push(`${environmentName} is missing public variable ${variable}`);
    }
  }

  for (const variable of publicVariables) {
    if (
      forbiddenPublicFragments.some((fragment) => variable.includes(fragment))
    ) {
      errors.push(
        `${environmentName} exposes forbidden public variable ${variable}`,
      );
    }
  }

  if (!serverSecrets.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    errors.push(
      `${environmentName} must declare SUPABASE_SERVICE_ROLE_KEY as server-only`,
    );
  }
}

const requiredWorkers = [
  "account_deletion",
  "introduction_expiry",
  "conversation_message_retention",
  "notification_retention",
];

for (const workerName of requiredWorkers) {
  const worker = contract.maintenanceWorkers?.[workerName];

  if (!worker) {
    errors.push(`Missing maintenance worker contract: ${workerName}`);
    continue;
  }

  if (
    !Number.isInteger(worker.maxIntervalMinutes) ||
    worker.maxIntervalMinutes < 1
  ) {
    errors.push(`${workerName}.maxIntervalMinutes must be a positive integer`);
  }

  if (worker.requiredBeforeRelease !== true) {
    errors.push(`${workerName} must be required before release`);
  }
}

const requirements = contract.releaseRequirements ?? {};
for (const [name, enabled] of Object.entries(requirements)) {
  if (enabled !== true) {
    errors.push(`Release requirement ${name} must remain enabled`);
  }
}

if (errors.length > 0) {
  console.error("Release contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Release contract valid: ${requiredEnvironments.length} environments, ${requiredWorkers.length} required maintenance workers.`,
);
