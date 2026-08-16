#!/usr/bin/env bash
set -euo pipefail

mkdir -p scripts public/icons src/test tests/e2e supabase/tests/database supabase/migrations src/types
: > supabase/migrations/.gitkeep
cat > scripts/generate-pwa-icons.mjs <<'EOF'
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");

function iconSvg(size, { maskable = false } = {}) {
  const safeInset = maskable ? size * 0.2 : size * 0.1;
  const markWidth = size - safeInset * 2;
  const left = safeInset;
  const top = safeInset;
  const archRadius = markWidth / 2;
  const doorInset = markWidth * 0.19;
  const goldLine = size * 0.024;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.18}" fill="#0F4D3F"/>
      <path
        d="M ${left} ${size - safeInset}
           V ${top + archRadius}
           A ${archRadius} ${archRadius} 0 0 1 ${left + markWidth} ${top + archRadius}
           V ${size - safeInset} Z"
        fill="#F8F4EA"
      />
      <path
        d="M ${left + doorInset} ${size - safeInset}
           V ${top + archRadius + doorInset}
           A ${archRadius - doorInset} ${archRadius - doorInset} 0 0 1 ${left + markWidth - doorInset} ${top + archRadius + doorInset}
           V ${size - safeInset}"
        fill="none"
        stroke="#0F4D3F"
        stroke-width="${size * 0.045}"
        stroke-linecap="round"
      />
      <path
        d="M ${size / 2} ${top + archRadius + doorInset * 0.55} V ${size - safeInset - doorInset * 0.35}"
        stroke="#A98342"
        stroke-width="${goldLine}"
        stroke-linecap="round"
      />
      <circle cx="${size / 2}" cy="${size * 0.58}" r="${size * 0.022}" fill="#A98342"/>
    </svg>
  `;
}

async function writeIcon(fileName, size, options) {
  await sharp(Buffer.from(iconSvg(size, options)))
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDirectory, fileName));
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeIcon("icon-192.png", 192),
  writeIcon("icon-512.png", 512),
  writeIcon("icon-maskable-512.png", 512, { maskable: true }),
  writeIcon("apple-touch-icon.png", 180)
]);

console.log("Generated provisional Mithaq PWA icons in public/icons.");
EOF
cat > src/test/setup.ts <<'EOF'
import "@testing-library/jest-dom/vitest";
EOF
cat > src/i18n/locale.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import {
  getDirection,
  getOppositeLocale,
  isLocale,
  switchLocaleInPath
} from "./locale";

describe("locale utilities", () => {
  it("validates only supported locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("maps Arabic to RTL and English to LTR", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });

  it("returns the opposite supported locale", () => {
    expect(getOppositeLocale("ar")).toBe("en");
    expect(getOppositeLocale("en")).toBe("ar");
  });

  it("switches or inserts the locale prefix without dropping the path", () => {
    expect(switchLocaleInPath("/ar", "en")).toBe("/en");
    expect(switchLocaleInPath("/en/example?x=1", "ar")).toBe(
      "/ar/example?x=1"
    );
    expect(switchLocaleInPath("/example", "ar")).toBe("/ar/example");
  });
});
EOF
cat > src/components/layout/locale-switcher.test.tsx <<'EOF'
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "./locale-switcher";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock()
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/ar");
  });

  it("links an Arabic page to its English equivalent", () => {
    render(
      <LocaleSwitcher
        locale="ar"
        label="View the English version"
        shortLabel="English"
      />
    );

    const link = screen.getByRole("link", {
      name: "View the English version"
    });

    expect(link).toHaveAttribute("href", "/en");
    expect(link).toHaveAttribute("hreflang", "en");
    expect(link).toHaveAttribute("lang", "en");
    expect(link).toHaveAttribute("dir", "ltr");
  });

  it("preserves the current path while changing direction", () => {
    usePathnameMock.mockReturnValue("/en/privacy-safety");

    render(
      <LocaleSwitcher
        locale="en"
        label="عرض النسخة العربية"
        shortLabel="العربية"
      />
    );

    const link = screen.getByRole("link", { name: "عرض النسخة العربية" });
    expect(link).toHaveAttribute("href", "/ar/privacy-safety");
    expect(link).toHaveAttribute("dir", "rtl");
  });
});
EOF
cat > src/components/pwa/connectivity-status.test.tsx <<'EOF'
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import englishMessages from "@/messages/en.json";
import {
  ConnectivityStatus,
  getConnectivitySnapshot
} from "./connectivity-status";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value
  });
}

function renderStatus() {
  return render(
    <NextIntlClientProvider locale="en" messages={englishMessages}>
      <ConnectivityStatus />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe("connectivity status", () => {
  it("reads the browser connectivity snapshot", () => {
    setOnline(false);
    expect(getConnectivitySnapshot()).toBe(false);

    setOnline(true);
    expect(getConnectivitySnapshot()).toBe(true);
  });

  it("reacts to offline and online browser events", () => {
    setOnline(true);
    renderStatus();

    expect(screen.getByTestId("connectivity-status")).toHaveAttribute(
      "data-state",
      "online"
    );

    setOnline(false);
    act(() => window.dispatchEvent(new Event("offline")));

    expect(screen.getByTestId("connectivity-status")).toHaveAttribute(
      "data-state",
      "offline"
    );
    expect(
      screen.getByText(
        "The saved interface remains available, but submitting data will require a connection."
      )
    ).toBeInTheDocument();
  });
});
EOF
cat > src/components/ui/button.test.tsx <<'EOF'
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

  it("can provide button styling to an accessible link", () => {
    render(
      <Button asChild variant="outline">
        <a href="/ar">Mithaq</a>
      </Button>
    );

    expect(screen.getByRole("link", { name: "Mithaq" })).toHaveAttribute(
      "href",
      "/ar"
    );
  });
});
EOF
cat > src/lib/env-schema.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import { environmentSchema } from "./env-schema";

const validEnvironment = {
  APP_ENV: "local",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-placeholder"
};

describe("environment schema", () => {
  it("accepts a complete safe public configuration", () => {
    expect(environmentSchema.safeParse(validEnvironment).success).toBe(true);
  });

  it("rejects missing keys and invalid URLs", () => {
    expect(
      environmentSchema.safeParse({
        ...validEnvironment,
        NEXT_PUBLIC_SITE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ""
      }).success
    ).toBe(false);
  });

  it("does not define a service-role credential", () => {
    expect(Object.keys(environmentSchema.shape)).not.toContain(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
  });
});
EOF
cat > tests/e2e/foundation.spec.ts <<'EOF'
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const locales = [
  { path: "/ar", language: "ar", direction: "rtl" },
  { path: "/en", language: "en", direction: "ltr" }
] as const;

test("the root URL deterministically redirects to Arabic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar\/?$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

for (const locale of locales) {
  test(`${locale.path} renders the expected language and direction`, async ({
    page
  }) => {
    await page.goto(locale.path);
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale.language
    );
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale.direction
    );
  });

  test(`${locale.path} has no serious accessibility violations`, async ({
    page
  }) => {
    await page.goto(locale.path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test(`${locale.path} has no horizontal overflow at a mobile viewport`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(locale.path);

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth
    }));

    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  });
}

test("the locale switcher preserves the equivalent route", async ({ page }) => {
  await page.goto("/ar");
  await page.getByRole("link", { name: "عرض النسخة الإنجليزية" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.getByRole("link", { name: "عرض النسخة العربية" }).click();
  await expect(page).toHaveURL(/\/ar\/?$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("the web app manifest declares an installable shell and valid icons", async ({
  request
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    display: string;
    lang: string;
    dir: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };

  expect(manifest).toMatchObject({
    name: "ميثاق | Mithaq",
    start_url: "/ar",
    display: "standalone",
    lang: "ar",
    dir: "rtl"
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" })
    ])
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }

  const appleIcon = await request.get("/icons/apple-touch-icon.png");
  expect(appleIcon.ok()).toBe(true);
});

test("the offline fallback is bilingual and reachable", async ({ page }) => {
  const response = await page.goto("/~offline");
  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "أنت غير متصل الآن" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You are offline" })
  ).toBeVisible();
});

test("the health endpoint is no-store and reveals no configuration", async ({
  request
}) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = await response.json();
  expect(body).toEqual({ status: "ok", application: "Mithaq" });
  expect(JSON.stringify(body)).not.toMatch(/supabase|key|secret|environment/i);
});

test("the production service worker registers from the Serwist route", async ({
  page
}) => {
  await page.goto("/ar");

  const registration = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    const ready = await navigator.serviceWorker.ready;
    return {
      scope: ready.scope,
      scriptURL:
        ready.active?.scriptURL ??
        ready.waiting?.scriptURL ??
        ready.installing?.scriptURL ??
        null
    };
  });

  expect(registration).not.toBeNull();
  expect(registration?.scope).toBe("http://127.0.0.1:3000/");
  expect(registration?.scriptURL).toContain("/serwist/sw.js");
});

test("captures Arabic and English mobile foundation references", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/ar");
  await page.screenshot({
    path: "test-results/foundation-ar-mobile.png",
    fullPage: true
  });

  await page.goto("/en");
  await page.screenshot({
    path: "test-results/foundation-en-mobile.png",
    fullPage: true
  });
});
EOF
cat > supabase/config.toml <<'EOF'
project_id = "mithaq"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000/**", "http://127.0.0.1:3000/**"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[auth.sms]
enable_signup = false
enable_confirmations = false

[storage]
enabled = true
file_size_limit = "50MiB"
EOF
cat > supabase/seed.sql <<'EOF'
-- Milestone 1 intentionally seeds no application records.
-- Stage A reference data will be introduced with reviewed migrations in Milestone 3.
EOF
cat > supabase/tests/database/000_smoke.sql <<'EOF'
begin;

select plan(3);
select has_schema('public', 'public schema is available');
select has_schema('auth', 'Supabase Auth schema is available');
select has_table('auth', 'users', 'Supabase Auth users table is available');
select * from finish();

rollback;
EOF
