import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("Resetting only generated mobile dependencies and caches...");
rmSync(resolve(mobileRoot, "node_modules"), { recursive: true, force: true });
rmSync(resolve(mobileRoot, "package-lock.json"), { force: true });
rmSync(resolve(mobileRoot, ".expo"), { recursive: true, force: true });

console.log("Installing the pinned Expo SDK 54 preview stack...");
run(["install", "--legacy-peer-deps"]);

console.log("Running mobile TypeScript and formatting checks...");
run(["run", "check"]);

console.log("SDK 54 preview dependencies are ready.");
console.log("Start the app with: npx expo start --clear");

function run(args) {
  const result = spawnSync(npmCommand, args, {
    cwd: mobileRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
