import { test, expect } from "@playwright/test";

test.describe("dashboard and host route protections", () => {
  const protectedRoutes = [
    "/admin",
    "/customer-support-dashboard",
    "/financial-dashboard",
    "/host-dashboard",
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated access to ${route} redirects to auth with redirect param`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });

      await expect(page).toHaveURL(new RegExp(`^.*\\/auth\\?mode=login&redirect=${encodeURIComponent(route)}$`));
    });
  }

  test("legacy support dashboard route resolves into auth flow for customer support dashboard", async ({ page }) => {
    await page.goto("/support-dashboard", { waitUntil: "networkidle" });

    const expectedRedirect = encodeURIComponent("/customer-support-dashboard");
    await expect(page).toHaveURL(new RegExp(`^.*\\/auth\\?mode=login&redirect=${expectedRedirect}$`));
  });

  test("create-tour keeps query params in auth redirect", async ({ page }) => {
    await page.goto("/create-tour?editId=listing-123", { waitUntil: "networkidle" });

    const expectedRedirect = encodeURIComponent("/create-tour?editId=listing-123");
    await expect(page).toHaveURL(new RegExp(`^.*\\/auth\\?mode=login&redirect=${expectedRedirect}$`));
  });

  test("become-host page exposes sign-in link with redirect parameter", async ({ page }) => {
    await page.goto("/become-host", { waitUntil: "networkidle" });

    const signInButton = page.getByRole("button", { name: "Sign In to Continue" });
    await expect(signInButton).toBeVisible();
    await signInButton.click();

    await expect(page).toHaveURL(/^.*\/auth\?redirect=\/become-host$/);
  });
});
