import { readFile } from "node:fs/promises";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const [rootPackage, mobilePackage, appConfig, easConfig] = await Promise.all([
  readJson("../package.json"),
  readJson("../apps/mobile/package.json"),
  readJson("../apps/mobile/app.json"),
  readJson("../apps/mobile/eas.json"),
]);

const errors = [];
const versions = [
  ["root package", rootPackage.version],
  ["mobile package", mobilePackage.version],
  ["Expo app", appConfig.expo?.version],
];
const expectedVersion = rootPackage.version;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedVersion ?? "")) {
  errors.push("Root package version must be a valid semantic version");
}

for (const [label, version] of versions) {
  if (version !== expectedVersion) {
    errors.push(
      `${label} version ${version ?? "missing"} must equal ${expectedVersion}`,
    );
  }
}

const iosBuildNumber = appConfig.expo?.ios?.buildNumber;
if (!/^\d+$/.test(iosBuildNumber ?? "") || Number(iosBuildNumber) < 1) {
  errors.push("Expo iOS buildNumber must be a positive integer string");
}

const androidVersionCode = appConfig.expo?.android?.versionCode;
if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
  errors.push("Expo Android versionCode must be a positive integer");
}

const bundleIdentifier = appConfig.expo?.ios?.bundleIdentifier;
const androidPackage = appConfig.expo?.android?.package;
if (!bundleIdentifier || !androidPackage) {
  errors.push("Both iOS bundleIdentifier and Android package must be configured");
}

const expectedProfileEnvironments = {
  development: "development",
  preview: "preview",
  production: "production",
};

for (const [profileName, environmentName] of Object.entries(
  expectedProfileEnvironments,
)) {
  const profile = easConfig.build?.[profileName];
  if (!profile) {
    errors.push(`Missing EAS build profile: ${profileName}`);
    continue;
  }

  if (profile.environment !== environmentName) {
    errors.push(
      `${profileName} EAS profile must use the ${environmentName} environment`,
    );
  }
}

if (easConfig.build?.preview?.distribution !== "internal") {
  errors.push("Preview EAS profile must remain internal distribution");
}

if (easConfig.build?.production?.autoIncrement !== true) {
  errors.push("Production EAS builds must auto-increment native build numbers");
}

if (errors.length > 0) {
  console.error("Release metadata validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Release metadata valid: version ${expectedVersion}, iOS build ${iosBuildNumber}, Android build ${androidVersionCode}.`,
);
