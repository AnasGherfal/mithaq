import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = resolve(repositoryRoot, "apps/mobile");
const requireEasProject = process.argv.includes("--require-eas-project");

const appConfig = JSON.parse(
  await readFile(resolve(mobileRoot, "app.json"), "utf8"),
);
const easConfig = JSON.parse(
  await readFile(resolve(mobileRoot, "eas.json"), "utf8"),
);
const mobilePackage = JSON.parse(
  await readFile(resolve(mobileRoot, "package.json"), "utf8"),
);

const errors = [];
const warnings = [];
const expo = appConfig.expo ?? {};
const dependencies = mobilePackage.dependencies ?? {};

function requirePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    errors.push(`${label} must be a positive integer`);
  }
}

function requireDependency(name, expectedPrefix) {
  const version = dependencies[name];
  if (typeof version !== "string") {
    errors.push(`Mobile dependency ${name} is required`);
    return;
  }
  if (expectedPrefix && !version.startsWith(expectedPrefix)) {
    errors.push(
      `Mobile dependency ${name} must stay on ${expectedPrefix}x for this beta branch (found ${version})`,
    );
  }
}

function hasExpoPlugin(name) {
  return (expo.plugins ?? []).some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name,
  );
}

async function resolveAsset(relativePath, label) {
  if (!relativePath || typeof relativePath !== "string") {
    errors.push(`${label} must reference a committed asset`);
    return null;
  }

  const assetPath = resolve(mobileRoot, relativePath);
  try {
    await access(assetPath);
    return assetPath;
  } catch {
    errors.push(`${label} asset does not exist: ${relativePath}`);
    return null;
  }
}

async function requireNativeIcon(relativePath, label) {
  const assetPath = await resolveAsset(relativePath, label);
  if (!assetPath) return;

  try {
    const metadata = await sharp(assetPath).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== 1024 ||
      metadata.height !== 1024
    ) {
      errors.push(`${label} must be a square 1024x1024 PNG`);
    }
  } catch {
    errors.push(`${label} must be a readable PNG asset`);
  }
}

if (expo.name !== "Mithaq") {
  errors.push("Expo app name must remain Mithaq");
}
if (expo.slug !== "mithaq") {
  errors.push("Expo slug must remain mithaq");
}
if (!/^\d+\.\d+\.\d+$/.test(expo.version ?? "")) {
  errors.push("Expo version must be a semantic x.y.z version");
}
if (expo.scheme !== "mithaq") {
  errors.push("Expo deep-link scheme must remain mithaq");
}

const bundleIdentifier = expo.ios?.bundleIdentifier;
if (!/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(bundleIdentifier ?? "")) {
  errors.push("iOS bundleIdentifier must be a reverse-DNS identifier");
}
if (bundleIdentifier !== "com.mithaq.app") {
  errors.push("iOS bundleIdentifier must remain com.mithaq.app");
}
requirePositiveInteger(expo.ios?.buildNumber, "iOS buildNumber");

const androidPackage = expo.android?.package;
if (
  !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(
    androidPackage ?? "",
  )
) {
  errors.push("Android package must be a reverse-DNS identifier");
}
if (androidPackage !== "com.mithaq.app") {
  errors.push("Android package must remain com.mithaq.app");
}
requirePositiveInteger(expo.android?.versionCode, "Android versionCode");

// Native beta stack. SDK 54 intentionally stays pinned for the current closed
// beta because it targets Android API 36 and EAS supports Xcode 26 for iOS.
requireDependency("expo", "~54.");
requireDependency("react", "19.1.");
requireDependency("react-native", "0.81.");
requireDependency("expo-dev-client", "~6.0.");
requireDependency("expo-screen-capture", "~8.0.");
requireDependency("expo-notifications", "~0.32.");
requireDependency("expo-secure-store", "~15.0.");
requireDependency("expo-local-authentication", "~17.0.");
requireDependency("expo-image-picker", "~17.0.");
requireDependency("expo-router", "~6.0.");

for (const plugin of [
  "expo-router",
  "expo-notifications",
  "expo-image-picker",
  "expo-local-authentication",
  "expo-secure-store",
  "expo-splash-screen",
]) {
  if (!hasExpoPlugin(plugin)) {
    errors.push(`Expo plugin ${plugin} is required for native beta builds`);
  }
}

await requireNativeIcon(expo.icon, "Expo icon");
await requireNativeIcon(
  expo.android?.adaptiveIcon?.foregroundImage,
  "Android adaptive foreground",
);

const splashPlugin = (expo.plugins ?? []).find(
  (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
);
await resolveAsset(splashPlugin?.[1]?.image, "Splash image");

const development = easConfig.build?.development;
if (
  development?.developmentClient !== true ||
  development?.environment !== "development" ||
  development?.distribution !== "internal"
) {
  errors.push(
    "EAS development must be an internal development-client build using the development environment",
  );
}

const preview = easConfig.build?.preview;
if (
  preview?.environment !== "preview" ||
  preview?.distribution !== "internal"
) {
  errors.push(
    "EAS preview must remain an internal build using the preview environment",
  );
}
if (preview?.ios?.autoIncrement !== "buildNumber") {
  errors.push("EAS preview must auto-increment the iOS build number");
}

const production = easConfig.build?.production;
if (production?.environment !== "production") {
  errors.push("EAS production must use the production environment");
}
if (production?.autoIncrement !== true) {
  errors.push("EAS production must auto-increment native build versions");
}

const easProjectId = expo.extra?.eas?.projectId;
if (typeof easProjectId !== "string" || !/^[0-9a-f-]{36}$/i.test(easProjectId)) {
  const message =
    "Expo/EAS project is not linked yet; run EAS project linking before the first development build so remote push registration receives a real projectId";
  if (requireEasProject) errors.push(message);
  else warnings.push(message);
}

const requiredPublicStoreRoutes = ["privacy", "account-deletion", "contact"];
for (const route of requiredPublicStoreRoutes) {
  const pagePath = resolve(
    repositoryRoot,
    `src/app/(localized)/[locale]/${route}/page.tsx`,
  );
  try {
    await access(pagePath);
  } catch {
    errors.push(`Missing public store-review route: /[locale]/${route}`);
  }
}

try {
  await access(resolve(repositoryRoot, "ops/STORE_SUBMISSION_CHECKLIST.md"));
} catch {
  errors.push("Missing ops/STORE_SUBMISSION_CHECKLIST.md");
}

if (warnings.length > 0) {
  console.warn("Native beta readiness notes:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("Store readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Store readiness valid: ${bundleIdentifier} / ${androidPackage}, Expo SDK 54 native beta stack present, 1024px native artwork present, development/preview/production EAS profiles locked, and ${requiredPublicStoreRoutes.length} public review routes present.`,
);
