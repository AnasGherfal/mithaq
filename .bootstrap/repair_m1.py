from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()


def replace(path: str, old: str, new: str) -> None:
    target = ROOT / path
    content = target.read_text(encoding="utf-8")
    if old not in content:
        raise RuntimeError(f"Expected text was not found in {path}: {old[:80]!r}")
    target.write_text(content.replace(old, new), encoding="utf-8")


replace(
    ".gitignore",
    "# TypeScript\n*.tsbuildinfo\nnext-env.d.ts\n",
    "# TypeScript\n*.tsbuildinfo\n",
)

replace(
    "next.config.ts",
    'import type { NextConfig } from "next";\n',
    'import type { NextConfig } from "next";\nimport createNextIntlPlugin from "next-intl/plugin";\n',
)
replace(
    "next.config.ts",
    "export default nextConfig;\n",
    'const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");\n\nexport default withNextIntl(nextConfig);\n',
)

package_path = ROOT / "package.json"
package_data = json.loads(package_path.read_text(encoding="utf-8"))
package_data["devDependencies"]["esbuild"] = "latest"
package_path.write_text(
    json.dumps(package_data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

replace(
    "vitest.config.ts",
    'import path from "node:path";\n',
    'import { fileURLToPath } from "node:url";\n',
)
replace(
    "vitest.config.ts",
    '"@": path.resolve(__dirname, "./src"),',
    '"@": fileURLToPath(new URL("./src", import.meta.url)),',
)
replace(
    "vitest.config.ts",
    '    coverage: {\n      reporter: ["text", "json", "html"],\n    },\n',
    "",
)

replace(
    "src/components/foundation-shell.tsx",
    'import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";',
    'import { LockKeyhole, Milestone, ShieldCheck } from "lucide-react";',
)
replace(
    "src/components/foundation-shell.tsx",
    '<Sparkles aria-hidden="true" className="size-4" />',
    '<Milestone aria-hidden="true" className="size-4" />',
)

provider = ROOT / "src/components/pwa/service-worker-provider.tsx"
provider_text = provider.read_text(encoding="utf-8")
provider_text = provider_text.replace(
    "\n    let registration: ServiceWorkerRegistration | undefined;\n",
    "\n",
)
provider_text = provider_text.replace(
    "\n        registration = nextRegistration;\n",
    "\n",
)
provider_text = provider_text.replace(
    "\n      registration = undefined;",
    "",
)
provider.write_text(provider_text, encoding="utf-8")

connectivity_path = ROOT / "src/components/pwa/connectivity-banner.tsx"
connectivity_path.write_text(
    '''"use client";\n\nimport { useSyncExternalStore } from "react";\nimport { WifiOff } from "lucide-react";\nimport { useTranslations } from "next-intl";\n\nexport function nextConnectivityState(eventType: "online" | "offline") {\n  return eventType === "online";\n}\n\nfunction subscribeToConnectivity(onStoreChange: () => void) {\n  window.addEventListener("online", onStoreChange);\n  window.addEventListener("offline", onStoreChange);\n\n  return () => {\n    window.removeEventListener("online", onStoreChange);\n    window.removeEventListener("offline", onStoreChange);\n  };\n}\n\nfunction getConnectivitySnapshot() {\n  return navigator.onLine;\n}\n\nfunction getServerConnectivitySnapshot() {\n  return true;\n}\n\nexport function ConnectivityBanner() {\n  const t = useTranslations("Pwa");\n  const isOnline = useSyncExternalStore(\n    subscribeToConnectivity,\n    getConnectivitySnapshot,\n    getServerConnectivitySnapshot,\n  );\n\n  if (isOnline) return null;\n\n  return (\n    <div\n      className="fixed inset-x-0 top-0 z-50 flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-sm text-background"\n      role="status"\n      aria-live="polite"\n    >\n      <WifiOff className="size-4 shrink-0" aria-hidden="true" />\n      <span>{t("offline")}</span>\n    </div>\n  );\n}\n''',
    encoding="utf-8",
)

replace(
    "src/app/(localized)/[locale]/layout.tsx",
    '    formatDetection: { telephone: false },\n',
    '    formatDetection: { telephone: false },\n    icons: { apple: "/icons/apple-touch-icon.png" },\n',
)

replace(
    "src/app/serwist/[path]/route.ts",
    'export const dynamic = "force-static";',
    'export const dynamic = "force-dynamic";',
)

print("Applied Milestone 1 validation repairs.")
