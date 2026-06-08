import { test, expect } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:8081";

test.describe("Merry360x Flutter App", () => {
  test("app loads and renders", async ({ page }) => {
    // Track console errors from the start
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to the Flutter web app
    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // Wait for the Flutter canvas to appear
    await page.waitForSelector("flt-scene, flutter-view, canvas", {
      timeout: 30_000,
    });

    // Wait for app initialization
    await page.waitForTimeout(5_000);

    // Take a screenshot
    await page.screenshot({
      path: "test-results/flutter-app-initial.png",
      fullPage: true,
    });

    // Check for Flutter engine errors (ignore Firebase init errors which are expected)
    const flutterErrors = errors.filter(
      (e) =>
        (e.includes("Flutter") && !e.includes("firebase")) ||
        e.includes("PlatformException") ||
        e.includes("RenderFlex") ||
        e.includes("overflowed")
    );

    if (flutterErrors.length > 0) {
      console.log("Flutter errors detected:", flutterErrors);
    }

    // The app should not have render/layout errors
    expect(flutterErrors.filter(e => e.includes("RenderFlex") || e.includes("overflowed"))).toHaveLength(0);
  });

  test("app loads without critical network failures", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("flt-scene, flutter-view, canvas", {
      timeout: 30_000,
    });
    await page.waitForTimeout(5_000);

    // Log any failed requests for debugging
    if (failedRequests.length > 0) {
      console.log("Failed network requests:", failedRequests);
    }

    // Ignore Firebase/Google failures since those are expected in test env
    const criticalFailures = failedRequests.filter(
      (r) =>
        !r.includes("firebase") &&
        !r.includes("google") &&
        !r.includes("gstatic") &&
        !r.includes("googleapis")
    );

    expect(criticalFailures.length).toBe(0);
  });

  test("responsive layout on mobile viewport", async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("flt-scene, flutter-view, canvas", {
      timeout: 30_000,
    });
    await page.waitForTimeout(8_000);

    await page.screenshot({
      path: "test-results/flutter-app-mobile.png",
      fullPage: false,
    });

    // Check for layout overflow warnings
    const overflowWarnings = consoleMessages.filter(
      (m) =>
        m.includes("overflow") ||
        m.includes("A RenderFlex overflowed") ||
        m.includes("exceeded by")
    );

    if (overflowWarnings.length > 0) {
      console.log("Overflow warnings:", overflowWarnings);
    }
  });

  test("tablet responsive layout", async ({ page }) => {
    // Set iPad-like viewport
    await page.setViewportSize({ width: 1024, height: 1366 });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("flt-scene, flutter-view, canvas", {
      timeout: 30_000,
    });
    await page.waitForTimeout(8_000);

    await page.screenshot({
      path: "test-results/flutter-app-tablet.png",
      fullPage: false,
    });
  });
});