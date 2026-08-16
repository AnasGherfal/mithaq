#!/usr/bin/env bash
set -euo pipefail

cat > 'src/app/(localized)/[locale]/not-found.tsx' <<'EOF'
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-3 text-2xl font-semibold">
          الصفحة غير موجودة · Page not found
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          تحقق من الرابط أو ارجع إلى الصفحة الرئيسية.
          <span lang="en" dir="ltr" className="mt-1 block">
            Check the address or return to the foundation page.
          </span>
        </p>
        <Link
          href="/ar"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          العودة إلى ميثاق
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </section>
    </main>
  );
}
EOF

cat > 'src/app/(offline)/~offline/page.tsx' <<'EOF'
import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-2xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-primary/15 bg-card p-7 shadow-sm sm:p-10">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/8 text-primary">
          <WifiOff aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-bold">أنت غير متصل الآن</h1>
        <p className="mt-3 leading-8 text-muted-foreground">
          يمكن عرض الهيكل الأساسي المحفوظ لموقع ميثاق. أعد الاتصال لفتح الصفحات
          التي تحتاج إلى الشبكة.
        </p>

        <div lang="en" dir="ltr" className="mt-7 border-t border-border pt-7">
          <h2 className="text-2xl font-semibold">You are offline</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            The saved Mithaq application shell is available. Reconnect before
            using any network-dependent page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            الصفحة العربية
          </Link>
          <Link
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2 text-sm font-semibold"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            إعادة المحاولة
          </Link>
        </div>
      </section>
    </main>
  );
}
EOF

cat > 'src/components/ui/button.test.tsx' <<'EOF'
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button and forwards interaction", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Continue securely</Button>);
    await user.click(
      screen.getByRole("button", { name: "Continue securely" })
    );

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("can provide button styling to an accessible external link", () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.com">Mithaq</a>
      </Button>
    );

    expect(screen.getByRole("link", { name: "Mithaq" })).toHaveAttribute(
      "href",
      "https://example.com"
    );
  });
});
EOF

cat > vitest.config.ts <<'EOF'
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}"
    ],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    env: {
      APP_ENV: "local",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "vitest-public-placeholder"
    }
  }
});
EOF

python3 <<'PY'
from pathlib import Path

path = Path("supabase/config.toml")
content = path.read_text()
content = content.replace("[inbucket]", "[local_smtp]")
path.write_text(content)
PY
