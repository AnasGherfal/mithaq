#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
import json
from pathlib import Path

config_path = Path("supabase/config.toml")
config = config_path.read_text(encoding="utf-8")
config = config.replace("[local_smtp]", "[inbucket]")
config_path.write_text(config, encoding="utf-8")

package_path = Path("package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
package["scripts"]["db:start:ci"] = (
    "supabase start -x "
    "gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,"
    "postgres-meta,studio,edge-runtime,logflare,vector,supavisor"
)
package_path.write_text(
    json.dumps(package, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
PY
