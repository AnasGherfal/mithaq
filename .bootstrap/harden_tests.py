from __future__ import annotations

from pathlib import Path

ROOT = Path.cwd()

(ROOT / "src/lib/env-schema.ts").write_text(
    '''import { z } from "zod";\n\nexport const environmentSchema = z.object({\n  APP_ENV: z.enum(["local", "preview", "staging", "production"]),\n  NEXT_PUBLIC_SITE_URL: z.string().url(),\n  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),\n  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),\n});\n\nexport function validateEnvironment(values: Record<string, string | undefined>) {\n  return environmentSchema.parse(values);\n}\n''',
    encoding="utf-8",
)

(ROOT / "src/lib/env.ts").write_text(
    '''import { createEnv } from "@t3-oss/env-nextjs";\nimport { environmentSchema } from "@/lib/env-schema";\n\nexport { environmentSchema, validateEnvironment } from "@/lib/env-schema";\n\nexport const env = createEnv({\n  server: {\n    APP_ENV: environmentSchema.shape.APP_ENV,\n  },\n  client: {\n    NEXT_PUBLIC_SITE_URL: environmentSchema.shape.NEXT_PUBLIC_SITE_URL,\n    NEXT_PUBLIC_SUPABASE_URL:\n      environmentSchema.shape.NEXT_PUBLIC_SUPABASE_URL,\n    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\n      environmentSchema.shape.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,\n  },\n  runtimeEnv: {\n    APP_ENV: process.env.APP_ENV,\n    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,\n    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,\n    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\n      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,\n  },\n  emptyStringAsUndefined: true,\n});\n''',
    encoding="utf-8",
)

env_test = ROOT / "tests/unit/env.test.ts"
env_test.write_text(
    env_test.read_text(encoding="utf-8").replace(
        'from "@/lib/env";',
        'from "@/lib/env-schema";',
    ),
    encoding="utf-8",
)

connectivity_test = ROOT / "tests/unit/connectivity-banner.test.tsx"
text = connectivity_test.read_text(encoding="utf-8")
text = text.replace(
    '    act(() => window.dispatchEvent(new Event("offline")));\n',
    '''    Object.defineProperty(window.navigator, "onLine", {\n      configurable: true,\n      value: false,\n    });\n    act(() => window.dispatchEvent(new Event("offline")));\n''',
)
connectivity_test.write_text(text, encoding="utf-8")

print("Hardened environment and connectivity unit test boundaries.")
