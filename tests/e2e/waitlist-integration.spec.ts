import { expect, test } from "@playwright/test";

const hasLocalSupabase = process.env.MITHAQ_E2E_SUPABASE === "1";

test.describe("Milestone 3 verified waitlist", () => {
  test.skip(
    !hasLocalSupabase,
    "Requires the local Supabase stack and deterministic test OTPs.",
  );

  test("completes phone OTP, questionnaire, consent, referral, and returning status", async ({
    page,
  }) => {
    await page.goto("/en/waitlist");

    await page.getByLabel("I confirm that I am 18 or older").check();
    await page
      .getByLabel("I am joining Mithaq with serious intent for marriage")
      .check();
    await page.getByLabel("Phone number").fill("+218910000001");
    await page.getByRole("button", { name: "Send verification code" }).click();

    await expect(page).toHaveURL(/\/en\/waitlist\/verify\/?$/);
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify and continue" }).click();

    await expect(page).toHaveURL(/\/en\/waitlist\/questionnaire\/?$/);
    await page.getByLabel("Current city").fill("Tripoli");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Save registration" }).click();

    await expect(page).toHaveURL(/\/en\/waitlist\/consent\/?$/);
    await page
      .getByLabel(
        /I agree to the Terms, Privacy Policy and waitlist data processing/,
      )
      .check();
    await page
      .getByLabel("I would like Mithaq waitlist and launch updates.")
      .check();
    await page.getByRole("button", { name: "Complete registration" }).click();

    await expect(page).toHaveURL(/\/en\/waitlist\/success\/?$/);
    await expect(
      page.getByRole("heading", {
        name: "You are now on the Mithaq waitlist",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not mean your identity is verified/i),
    ).toBeVisible();
    await expect(page.getByText("Your private referral link")).toBeVisible();

    await page.getByRole("link", { name: "View registration status" }).click();
    await expect(page).toHaveURL(/\/en\/waitlist\/status\/?$/);
    await expect(page.getByText("Phone number verified")).toBeVisible();
    await expect(page.getByText("Identity verification")).toBeVisible();
    await expect(page.getByText("Not available yet")).toBeVisible();

    await page
      .getByRole("link", { name: "Edit questionnaire answers" })
      .click();
    await expect(page).toHaveURL(/\/en\/waitlist\/questionnaire\/?$/);
    await expect(page.getByLabel("Current city")).toHaveValue("Tripoli");
  });
});
