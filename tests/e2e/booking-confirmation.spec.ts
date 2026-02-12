import { expect, test, type Page } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

const HOST_EMAIL = process.env.E2E_HOST_EMAIL;
const HOST_PASSWORD = process.env.E2E_HOST_PASSWORD;
const GUEST_EMAIL = process.env.E2E_GUEST_EMAIL;
const GUEST_PASSWORD = process.env.E2E_GUEST_PASSWORD;
const APPROVE_BOOKING_ID = process.env.E2E_APPROVE_BOOKING_ID;
const REJECT_BOOKING_ID = process.env.E2E_REJECT_BOOKING_ID;
const PENDING_BOOKING_ID = process.env.E2E_PENDING_BOOKING_ID;
const REJECTION_REASON = process.env.E2E_REJECTION_REASON || "Host unavailable for selected date";

function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function shortBookingId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth?mode=login", { waitUntil: "domcontentloaded" });

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForLoadState("networkidle");
}

async function openHostBookingsTab(page: Page) {
  await page.goto("/host-dashboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /bookings/i }).click();
  await page.waitForLoadState("networkidle");
}

async function findPendingCardByBookingId(page: Page, bookingId: string) {
  const shortId = shortBookingId(bookingId);
  return page
    .locator("div")
    .filter({ hasText: shortId })
    .filter({ has: page.getByRole("button", { name: /approve booking|reject/i }) })
    .first();
}

test.describe("Host booking confirmation flow", () => {
  test("host approves/rejects and guest sees confirmation messages", async ({ browser }) => {
    const missing = [
      ["E2E_HOST_EMAIL", HOST_EMAIL],
      ["E2E_HOST_PASSWORD", HOST_PASSWORD],
      ["E2E_GUEST_EMAIL", GUEST_EMAIL],
      ["E2E_GUEST_PASSWORD", GUEST_PASSWORD],
      ["E2E_APPROVE_BOOKING_ID", APPROVE_BOOKING_ID],
      ["E2E_REJECT_BOOKING_ID", REJECT_BOOKING_ID],
    ].filter(([, value]) => !value);

    test.skip(
      missing.length > 0,
      `Missing required env vars: ${missing.map(([name]) => name).join(", ")}`
    );

    const hostEmail = requireEnv("E2E_HOST_EMAIL", HOST_EMAIL);
    const hostPassword = requireEnv("E2E_HOST_PASSWORD", HOST_PASSWORD);
    const guestEmail = requireEnv("E2E_GUEST_EMAIL", GUEST_EMAIL);
    const guestPassword = requireEnv("E2E_GUEST_PASSWORD", GUEST_PASSWORD);
    const approveBookingId = requireEnv("E2E_APPROVE_BOOKING_ID", APPROVE_BOOKING_ID);
    const rejectBookingId = requireEnv("E2E_REJECT_BOOKING_ID", REJECT_BOOKING_ID);

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await login(hostPage, hostEmail, hostPassword);
    await openHostBookingsTab(hostPage);

    const approveCard = await findPendingCardByBookingId(hostPage, approveBookingId);
    await expect(approveCard).toBeVisible();
    await approveCard.getByRole("button", { name: /approve booking/i }).click();
    await expect(hostPage.getByText(/booking confirmed/i)).toBeVisible();

    const rejectCard = await findPendingCardByBookingId(hostPage, rejectBookingId);
    await expect(rejectCard).toBeVisible();
    await rejectCard.getByRole("button", { name: /^reject$/i }).click();

    const rejectDialog = hostPage.getByRole("dialog").filter({ hasText: /reject booking request/i });
    await expect(rejectDialog).toBeVisible();
    await rejectDialog.getByPlaceholder(/no permits available|group size too large/i).fill(REJECTION_REASON);
    await rejectDialog.getByRole("button", { name: /confirm rejection/i }).click();
    await expect(hostPage.getByText(/booking rejected/i)).toBeVisible();

    await hostContext.close();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await login(guestPage, guestEmail, guestPassword);
    await guestPage.goto("/my-bookings", { waitUntil: "domcontentloaded" });

    await expect(guestPage.getByText(/approved by host/i)).toBeVisible();
    await expect(guestPage.getByText(/rejected by host/i)).toBeVisible();
    await expect(guestPage.getByText(new RegExp(REJECTION_REASON.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))).toBeVisible();

    if (PENDING_BOOKING_ID) {
      await expect(guestPage.getByText(/awaiting host confirmation/i)).toBeVisible();
    }

    await guestContext.close();
  });
});
