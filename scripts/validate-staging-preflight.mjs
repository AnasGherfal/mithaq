import { readFile } from "node:fs/promises";

const environmentName = process.argv[2];
const contract = JSON.parse(
  await readFile(
    new URL("../ops/release-contract.json", import.meta.url),
    "utf8",
  ),
);

const errors = [];
const environment = contract.environments?.[environmentName];

if (!environment) {
  console.error(
    `Unknown release environment: ${environmentName ?? "<missing>"}. Expected one of ${Object.keys(contract.environments ?? {}).join(", ")}.`,
  );
  process.exit(1);
}

const expectedAppEnv = environment.appEnv;
if (process.env.APP_ENV !== expectedAppEnv) {
  errors.push(`APP_ENV must be ${expectedAppEnv}`);
}

for (const variableName of environment.publicVariables ?? []) {
  const value = process.env[variableName];
  if (!value) {
    errors.push(`Missing required public variable ${variableName}`);
  }
}

for (const variableName of environment.serverVariables ?? []) {
  const value = process.env[variableName];
  if (!value) {
    errors.push(`Missing required server variable ${variableName}`);
  }
}

for (const secretName of environment.serverSecrets ?? []) {
  const value = process.env[secretName];
  if (!value) {
    errors.push(`Missing required server secret ${secretName}`);
  }
}

function validateHttpsUrl(name) {
  const value = process.env[name];
  if (!value) return;

  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL`);
    return;
  }

  if (url.protocol !== "https:") {
    errors.push(`${name} must use https in hosted environments`);
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    errors.push(`${name} must not point to localhost in hosted environments`);
  }
}

for (const name of [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
]) {
  validateHttpsUrl(name);
}

const webSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mobileSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (
  webSupabaseUrl &&
  mobileSupabaseUrl &&
  webSupabaseUrl !== mobileSupabaseUrl
) {
  errors.push(
    "NEXT_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_URL must target the same Supabase project",
  );
}

for (const name of [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]) {
  const value = process.env[name];
  if (!value) continue;
  if (value.startsWith("sb_secret_") || value.startsWith("service_role")) {
    errors.push(
      `${name} must contain a publishable key, never a secret/service-role key`,
    );
  }
}

const webPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const mobilePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (
  webPublishableKey &&
  mobilePublishableKey &&
  webPublishableKey !== mobilePublishableKey
) {
  errors.push(
    "Web and mobile publishable keys must belong to the same hosted Supabase environment",
  );
}

for (const name of [
  "MITHAQ_CONVERSATION_RETENTION_DAYS",
  "MITHAQ_NOTIFICATION_RETENTION_DAYS",
]) {
  if (!(environment.serverVariables ?? []).includes(name)) continue;

  const value = process.env[name]?.trim();
  const days = Number(value);
  if (!value || !Number.isSafeInteger(days) || days < 1) {
    errors.push(`${name} must be a positive integer number of days`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Hosted ${environmentName} preflight valid.`);
