import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/how-it-works",
  "/for-women",
  "/for-men",
  "/privacy-safety",
  "/libya-diaspora",
  "/faq",
  "/privacy",
  "/terms",
  "/community-safety",
  "/contact",
  "/waitlist",
] as const;

for (const locale of ["ar", "en"] as const) {
  for (const route of publicRoutes) {
    test(`${locale}${route} renders the Milestone 2 public site`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${route}`);

      expect(response?.ok()).toBe(true);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main")).toBeVisible();
    });
  }
}

test("the waitlist preview does not collect registration data yet", async ({
  page,
}) => {
  await page.goto("/ar/waitlist");

  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("the locale switcher preserves a Milestone 2 trust route", async ({
  page,
}) => {
  await page.goto("/ar/privacy-safety");
  await page.getByRole("link", { name: "عرض النسخة الإنجليزية" }).click();

  await expect(page).toHaveURL(/\/en\/privacy-safety\/?$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("the mobile navigation exposes the core trust routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  const menu = page.locator("header details");
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");

  await expect(menu.locator('a[href="/en/how-it-works"]')).toBeVisible();
  await expect(menu.locator('a[href="/en/for-women"]')).toBeVisible();
  await expect(menu.locator('a[href="/en/privacy-safety"]')).toBeVisible();
  await expect(menu.locator('a[href="/en/waitlist"]')).toBeVisible();
});

test("captures Arabic and English Milestone 2 homepage references", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/ar");
  await page.screenshot({
    path: "test-results/milestone-2-ar-mobile.png",
    fullPage: true,
  });

  await page.goto("/en");
  await page.screenshot({
    path: "test-results/milestone-2-en-mobile.png",
    fullPage: true,
  });
});
