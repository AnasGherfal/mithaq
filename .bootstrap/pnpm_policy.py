from __future__ import annotations

import json
from pathlib import Path

root = Path.cwd()
package_path = root / "package.json"
package_data = json.loads(package_path.read_text(encoding="utf-8"))
package_data["pnpm"] = {
    "onlyBuiltDependencies": [
        "@tailwindcss/oxide",
        "esbuild",
        "sharp",
        "supabase",
    ]
}
package_path.write_text(
    json.dumps(package_data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

shell_path = root / "src/components/foundation-shell.tsx"
shell = shell_path.read_text(encoding="utf-8")
shell = shell.replace(
    "inset-inline-end-[-8rem]",
    "end-[-8rem]",
).replace(
    "inset-inline-start-[-10rem]",
    "start-[-10rem]",
)
shell_path.write_text(shell, encoding="utf-8")

print("Added the pnpm build-script allowlist and normalized logical utilities.")
