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
const requiredRetentionVariables = [
  "MITHAQ_CONVERSATION_RETENTION_DAYS",
  "MITHAQ_NOTIFICATION_RETENTION_DAYS",
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
  const serverVariables = environment.serverVariables ?? [];
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

  for (const variable of serverVariables) {
    if (variable.startsWith("NEXT_PUBLIC_") || variable.startsWith("EXPO_PUBLIC_")) {
      errors.push(
        `${environmentName} server variable ${variable} must not use a public prefix`,
      );
    }
  }

  if (["staging", "production"].includes(environmentName)) {
    for (const variable of requiredRetentionVariables) {
      if (!serverVariables.includes(variable)) {
        errors.push(
          `${environmentName} is missing server retention variable ${variable}`,
        );
      }
    }
  }

  if (!serverSecrets.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    errors.push(
      `${environmentName} must declare SUPABASE_SERVICE_ROLE_KEY as server-only`,
    );
  }
}

const requiredWorkerFunctions = {
  account_deletion: "account-deletion-worker",
  introduction_expiry: "introduction-expiry-worker",
  conversation_message_retention: "conversation-retention-worker",
  notification_retention: "notification-retention-worker",
};
const requiredWorkers = Object.keys(requiredWorkerFunctions);

for (const workerName of requiredWorkers) {
  const worker = contract.maintenanceWorkers?.[workerName];

  if (!worker) {
    errors.push(`Missing maintenance worker contract: ${workerName}`);
    continue;
  }

  const expectedFunction = requiredWorkerFunctions[workerName];
  if (worker.function !== expectedFunction) {
    errors.push(`${workerName}.function must remain ${expectedFunction}`);
  }

  try {
    const workerSource = await readFile(
      new URL(
        `../supabase/functions/${expectedFunction}/index.ts`,
        import.meta.url,
      ),
      "utf8",
    );
    if (!workerSource.trim()) {
      errors.push(`${workerName} worker entrypoint must not be empty`);
    }
  } catch {
    errors.push(
      `${workerName} is missing deployable function ${expectedFunction}/index.ts`,
    );
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
  "hostedEnvironmentPreflightRequired",
  "hostedReleaseVerificationRequired",
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

const standardExecutableGateScripts = {
  destructiveMigrationGuardRequired: "migration:safety:check",
  serviceRoleClientExposureForbidden: "client-secret-boundary:check",
};
const standardCheck = packageJson.scripts?.check ?? "";

for (const [requirementName, scriptName] of Object.entries(
  standardExecutableGateScripts,
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

const hostedPreflightScripts = [
  "release:preflight:staging",
  "release:preflight:production",
];
for (const scriptName of hostedPreflightScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(`Hosted environment preflight is missing script ${scriptName}`);
  }
}

const hostedVerificationScripts = [
  "release:verify:staging",
  "release:verify:production",
];
for (const scriptName of hostedVerificationScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(`Hosted release verification is missing script ${scriptName}`);
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
  `Release contract valid: ${requiredEnvironments.length} environments, ${requiredWorkers.length} deployable maintenance workers, ${requiredReleaseRequirements.length} release gates, ${requiredReleaseArtifacts.length} release artifacts.`,
);
