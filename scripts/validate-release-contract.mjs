import { readFile } from "node:fs/promises";

const contract = JSON.parse(
  await readFile(
    new URL("../ops/release-contract.json", import.meta.url),
    "utf8",
  ),
);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
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

const requiredReleaseRequirements = [
  "separateSupabaseProjects",
  "separateEasEnvironments",
  "serviceRoleClientExposureForbidden",
  "databaseMigrationsRequired",
  "destructiveMigrationGuardRequired",
  "pgtapRequired",
  "mobileTypecheckRequired",
  "expoDoctorRequired",
  "productionE2eRequired",
  "maintenanceReadinessRequired",
  "releaseMetadataRequired",
  "privacySafeServerObservabilityRequired",
  "contentSecurityPolicyRequired",
  "disasterRecoveryRunbookRequired",
];
const requirements = contract.releaseRequirements ?? {};

for (const requirementName of requiredReleaseRequirements) {
  if (requirements[requirementName] !== true) {
    errors.push(`Release requirement ${requirementName} must remain enabled`);
  }
}

const executableGateScripts = {
  destructiveMigrationGuardRequired: "migration:safety:check",
  serviceRoleClientExposureForbidden: "client-secret-boundary:check",
};
const standardCheck = packageJson.scripts?.check ?? "";

for (const [requirementName, scriptName] of Object.entries(
  executableGateScripts,
)) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(
      `Release requirement ${requirementName} is missing script ${scriptName}`,
    );
  }
  if (!standardCheck.includes(`pnpm ${scriptName}`)) {
    errors.push(`Standard check must execute ${scriptName}`);
  }
}

const requiredReleaseArtifacts = [
  "../ops/RELEASE_CHECKLIST.md",
  "../ops/DISASTER_RECOVERY.md",
];

for (const artifactPath of requiredReleaseArtifacts) {
  try {
    const artifact = await readFile(
      new URL(artifactPath, import.meta.url),
      "utf8",
    );
    if (!artifact.trim()) {
      errors.push(`Release artifact ${artifactPath} must not be empty`);
    }
  } catch {
    errors.push(`Missing required release artifact: ${artifactPath}`);
  }
}

if (errors.length > 0) {
  console.error("Release contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Release contract valid: ${requiredEnvironments.length} environments, ${requiredWorkers.length} required maintenance workers, ${requiredReleaseRequirements.length} release gates, ${requiredReleaseArtifacts.length} release artifacts.`,
);
