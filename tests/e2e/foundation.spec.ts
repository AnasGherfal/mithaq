import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import packageJson from "../../package.json";

const locales = [
  { path: "/ar", language: "ar", direction: "rtl" },
  { path: "/en", language: "en", direction: "ltr" },
] as const;

test("the root URL deterministically redirects to Arabic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar\/?$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

for (const locale of locales) {
  test(`${locale.path} renders the expected language and direction`, async ({
    page,
  }) => {
    await page.goto(locale.path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale.language);
    await expect(page.locator("html")).toHaveAttribute("dir", locale.direction);
  });

  test(`${locale.path} has no serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(locale.path, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("lang", locale.language);
    await page.waitForFunction(() => document.readyState === "complete");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test(`${locale.path} has no horizontal overflow at a mobile viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(locale.path);

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
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
  request,
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
    dir: "rtl",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
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
    page.getByRole("heading", { name: "أنت غير متصل الآن" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You are offline" }),
  ).toBeVisible();
});

test("the health endpoint exposes only privacy-safe release identity", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = (await response.json()) as {
    status: string;
    application: string;
    release: { version: string; tier: string; revision: string };
  };

  expect(body).toMatchObject({
    status: "ok",
    application: "Mithaq",
    release: { version: packageJson.version, tier: "local" },
  });
  expect(body.release.revision).toMatch(/^(unknown|[0-9a-f]{7,12})$/);
  expect(JSON.stringify(body)).not.toMatch(
    /supabase|key|secret|authorization|token|phone|email|message/i,
  );
});

test("the production service worker registers from the Serwist route", async ({
  page,
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
        null,
    };
  });

  expect(registration).not.toBeNull();
  expect(registration?.scope).toBe("http://127.0.0.1:3000/");
  expect(registration?.scriptURL).toContain("/serwist/sw.js");
});

test("captures Arabic and English mobile foundation references", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/ar");
  await page.screenshot({
    path: "test-results/foundation-ar-mobile.png",
    fullPage: true,
  });

  await page.goto("/en");
  await page.screenshot({
    path: "test-results/foundation-en-mobile.png",
    fullPage: true,
  });
});
