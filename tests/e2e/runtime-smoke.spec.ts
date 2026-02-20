import { test, expect } from "@playwright/test";

test("homepage loads without uncaught runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message || String(error));
  });

  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/$/);
  await expect(pageErrors, `Uncaught runtime errors:\n${pageErrors.join("\n")}`).toEqual([]);
});
