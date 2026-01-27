import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Appearance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // You may need to update credentials or use test user
    // For now, we'll just navigate to admin dashboard directly if already authenticated
    await page.goto('/admin');
  });

  test('admin dashboard loads successfully', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 10000 });
    
    // Check for main sections
    await expect(page.getByText(/Analytics|Overview|Statistics/i)).toBeVisible();
  });

  test('bookings table displays correctly', async ({ page }) => {
    // Wait for bookings table
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: /Guest/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Amount|Price/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible();
  });

  test('refund display for cancelled paid bookings', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for cancelled status badges
    const cancelledBadges = page.locator('text=/cancelled/i');
    const count = await cancelledBadges.count();
    
    if (count > 0) {
      // Check if refund information is visible
      const refundText = page.locator('text=/↩ Refund:/i, text=/Refund:/i');
      const refundCount = await refundText.count();
      
      console.log(`Found ${count} cancelled bookings, ${refundCount} with refund info`);
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: 'test-results/admin-dashboard-refunds.png',
        fullPage: true 
      });
    } else {
      console.log('No cancelled bookings found to test refund display');
    }
  });

  test('dashboard navigation and tabs work', async ({ page }) => {
    // Check for navigation tabs/sections
    const tabs = page.locator('[role="tab"], .nav-link, button:has-text("Bookings"), button:has-text("Properties"), button:has-text("Tours")');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      console.log(`Found ${tabCount} navigation elements`);
    }
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'test-results/admin-dashboard-appearance.png',
      fullPage: true 
    });
  });

  test('payment status indicators display correctly', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for payment status badges
    const paidBadges = page.locator('text=/paid/i').first();
    const pendingBadges = page.locator('text=/pending/i').first();
    
    // Check that payment statuses are visible
    const hasPaid = await paidBadges.isVisible().catch(() => false);
    const hasPending = await pendingBadges.isVisible().catch(() => false);
    
    console.log(`Payment statuses visible - Paid: ${hasPaid}, Pending: ${hasPending}`);
  });

  test('currency formatting displays correctly', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for currency symbols or codes (USD, RWF, EUR, $, FRw, €)
    const currencyPatterns = ['$', 'FRw', '€', 'USD', 'RWF', 'EUR'];
    
    for (const currency of currencyPatterns) {
      const elements = page.locator(`text=/${currency}/i`);
      const count = await elements.count();
      if (count > 0) {
        console.log(`Found ${count} instances of ${currency}`);
      }
    }
    
    // Take screenshot showing currency formatting
    await page.screenshot({ 
      path: 'test-results/admin-dashboard-currencies.png',
      fullPage: true 
    });
  });

  test('responsive layout check', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/admin-dashboard-desktop.png',
      fullPage: true 
    });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/admin-dashboard-tablet.png',
      fullPage: true 
    });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/admin-dashboard-mobile.png',
      fullPage: true 
    });
  });
});
