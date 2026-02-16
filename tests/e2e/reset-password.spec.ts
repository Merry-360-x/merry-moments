import { expect, test } from "@playwright/test";

test.describe("Reset password URL handling", () => {
  test("shows expired-link state for otp_expired", async ({ page }) => {
    await page.goto("/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /link expired/i })).toBeVisible();
    await expect(page.getByText(/this password reset link has expired/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /request new reset link/i })).toBeVisible();
  });

  test("decodes and shows error_description fallback", async ({ page }) => {
    await page.goto("/reset-password?error=access_denied&error_description=Reset+link+is+invalid", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /link expired/i })).toBeVisible();
    await expect(page.getByText("Reset link is invalid")).toBeVisible();
    await expect(page.getByRole("button", { name: /back to login/i })).toBeVisible();
  });
});
