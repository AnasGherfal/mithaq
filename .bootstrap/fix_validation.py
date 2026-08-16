from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()

package_path = ROOT / "package.json"
package_data = json.loads(package_path.read_text(encoding="utf-8"))
for name in ("next", "react", "react-dom"):
    package_data["dependencies"][name] = "latest"
package_data["devDependencies"]["eslint-config-next"] = "latest"
package_path.write_text(
    json.dumps(package_data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

test_path = ROOT / "tests/e2e/foundation.spec.ts"
test_text = test_path.read_text(encoding="utf-8")
test_text = test_text.replace(
    '  await page.getByRole("link", { name: /English/ }).click();\n',
    '  await page.locator(\'a[hreflang="en"]\').click();\n',
)
test_text = test_text.replace(
    '  await page.getByRole("link", { name: /العربية/ }).click();\n',
    '  await page.locator(\'a[hreflang="ar"]\').click();\n',
)
test_path.write_text(test_text, encoding="utf-8")

print("Applied final manifest and E2E selector fixes.")
