import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmExecPath = process.env.npm_execpath;

console.log("Checking npm before changing generated files...");
runNpm(["--version"]);

console.log("Resetting only generated mobile dependencies and caches...");
rmSync(resolve(mobileRoot, "node_modules"), { recursive: true, force: true });
rmSync(resolve(mobileRoot, ".expo"), { recursive: true, force: true });

console.log("Installing the pinned Expo SDK 54 preview stack...");
// Keep package-lock.json so Expo Doctor, CI, and native builds all use the same
// resolved dependency graph. If the lockfile is missing, npm creates it here.
runNpm(["install", "--legacy-peer-deps"]);

console.log("Running mobile TypeScript and formatting checks...");
runNpm(["run", "check"]);

console.log("SDK 54 preview dependencies are ready.");
console.log("Start the app with: npx expo start --clear");

function runNpm(args) {
  // When this script is started through `npm run`, npm exposes the exact CLI
  // entry point in npm_execpath. Running that JavaScript file with the current
  // Node executable avoids Windows spawnSync EINVAL issues with npm.cmd.
  if (npmExecPath && existsSync(npmExecPath)) {
    run(process.execPath, [npmExecPath, ...args], false);
    return;
  }

  // Fallback for direct `node scripts/bootstrap-preview.mjs` usage.
  // Windows command shims (.cmd) need shell execution; Unix can spawn npm
  // directly. Arguments are fixed by this repository script, not user input.
  const windows = process.platform === "win32";
  run(windows ? "npm.cmd" : "npm", args, windows);
}

function run(command, args, shell) {
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    stdio: "inherit",
    shell,
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
