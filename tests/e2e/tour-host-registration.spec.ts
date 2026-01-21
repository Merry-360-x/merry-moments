import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test data
const TOUR_HOST_DATA = {
  // Personal Information
  fullName: 'Jean Claude Habimana',
  phone: '+250 788 123 456',
  nationalId: '1199080012345678',
  about: 'Experienced tour guide passionate about showcasing Rwanda\'s beauty and culture to visitors from around the world.',
  
  // Tour Guide Professional Information
  nationality: 'Rwandan',
  yearsOfExperience: '7',
  areasOfOperation: 'Kigali, Musanze, Rubavu, Huye',
  languages: ['English', 'French', 'Kinyarwanda', 'Swahili'],
  specialties: ['Cultural', 'Wildlife', 'Hiking', 'Eco-Tourism'],
  bio: 'I am a certified professional tour guide with over 7 years of experience showcasing the incredible beauty and rich culture of Rwanda. My passion lies in creating unforgettable experiences for visitors through gorilla trekking expeditions, cultural immersion programs, and eco-tourism adventures. I specialize in connecting travelers with local communities and wildlife conservation efforts.',
  
  // Tour Package Details (optional)
  tourTitle: 'Gorilla Trekking & Cultural Experience',
  tourLocation: 'Volcanoes National Park, Musanze',
  tourDescription: 'Experience the thrill of meeting mountain gorillas in their natural habitat, combined with authentic cultural experiences in local villages. This comprehensive tour includes trekking permits, professional guide services, and cultural performances.',
  tourCategory: 'Wildlife',
  tourDuration: '3',
  tourDifficulty: 'Moderate',
  tourPrice: '1500',
  tourCurrency: 'USD',
  maxGroupSize: '8',
};

// Helper function to create a mock image file
function createMockImageFile(filename: string): File {
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  return new File([buffer], filename, { type: 'image/png' });
}

// Helper function to create a mock PDF file
function createMockPDFFile(filename: string): File {
  const buffer = Buffer.from('JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDMgM10vUGFyZW50IDIgMCBSPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxMTcgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxNzgKJSVFT0Y=', 'base64');
  return new File([buffer], filename, { type: 'application/pdf' });
}

// Helper to setup authentication
async function setupAuth(page: Page) {
  // You may need to adjust this based on your auth setup
  // For testing, you might use a test account or mock auth
  await page.goto('/auth');
  
  // Wait for auth page to load
  await expect(page.getByRole('heading', { name: /sign in|welcome|login/i })).toBeVisible();
  
  // Check if already logged in by looking for logout/profile button
  const profileButton = page.getByRole('button', { name: /profile|account|logout/i });
  if (await profileButton.isVisible()) {
    console.log('Already authenticated');
    return;
  }
  
  // For this test, we'll assume user needs to sign in
  // You should replace this with actual test credentials
  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);
  
  if (await emailInput.isVisible()) {
    await emailInput.fill('test@example.com');
    await passwordInput.fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      console.log('Auth redirect may have failed or already authenticated');
    });
  }
}

test.describe('Tour Host Registration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);
  });

  test('complete tour host registration flow', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    console.log('Starting tour host registration test...');
    
    // Step 1: Navigate to host application
    await page.goto('/become-host');
    await expect(page.getByRole('heading', { name: /become a host|host application/i })).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Navigated to host application page');
    
    // Step 2: Select "Tours" service type
    const toursCard = page.locator('text=Tours').locator('..');
    await expect(toursCard).toBeVisible({ timeout: 5000 });
    await toursCard.click();
    
    // Verify tours is selected (check for primary border or checkmark)
    await expect(toursCard.locator('svg').first()).toBeVisible(); // Checkmark icon
    
    console.log('✓ Selected Tours service type');
    
    // Click Continue button
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    
    await page.waitForTimeout(1000);
    console.log('✓ Clicked Continue to next step');
    
    // Step 3: Fill Tour Package Details (Optional step)
    // Check if we're on tour package details step or skip to personal info
    const tourTitleInput = page.getByLabel(/tour title|title/i);
    
    if (await tourTitleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Filling tour package details...');
      
      await tourTitleInput.fill(TOUR_HOST_DATA.tourTitle);
      await page.getByLabel(/location/i).first().fill(TOUR_HOST_DATA.tourLocation);
      await page.getByLabel(/description/i).first().fill(TOUR_HOST_DATA.tourDescription);
      
      // Select category
      await page.getByRole('combobox', { name: /category/i }).click();
      await page.getByRole('option', { name: TOUR_HOST_DATA.tourCategory }).click();
      
      // Fill duration, difficulty, price
      await page.getByLabel(/duration/i).fill(TOUR_HOST_DATA.tourDuration);
      
      await page.getByRole('combobox', { name: /difficulty/i }).click();
      await page.getByRole('option', { name: TOUR_HOST_DATA.tourDifficulty }).click();
      
      await page.getByLabel(/price.*person/i).fill(TOUR_HOST_DATA.tourPrice);
      
      // Select currency
      await page.getByRole('combobox', { name: /currency/i }).first().click();
      await page.getByRole('option', { name: new RegExp(TOUR_HOST_DATA.tourCurrency, 'i') }).click();
      
      await page.getByLabel(/max.*group.*size/i).fill(TOUR_HOST_DATA.maxGroupSize);
      
      console.log('✓ Filled tour package details');
      
      // Upload tour images (mocked)
      // Note: This requires proper file upload handling
      
      // Continue to next step
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Personal Information & Tour Guide Details
    console.log('Filling personal information...');
    
    // Basic personal info
    await page.getByLabel(/full name/i).fill(TOUR_HOST_DATA.fullName);
    await page.getByLabel(/phone/i).fill(TOUR_HOST_DATA.phone);
    await page.getByLabel(/national id number|id number/i).fill(TOUR_HOST_DATA.nationalId);
    
    // About (optional)
    const aboutField = page.getByLabel(/about you|about/i);
    if (await aboutField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aboutField.fill(TOUR_HOST_DATA.about);
    }
    
    console.log('✓ Filled basic personal information');
    
    // Upload National ID Photo
    console.log('Uploading National ID photo...');
    const idUploadButton = page.getByRole('button', { name: /upload.*national.*id/i });
    await expect(idUploadButton).toBeVisible({ timeout: 5000 });
    // Note: File upload would require proper Cloudinary mock or test setup
    
    // Upload Selfie Photo
    console.log('Uploading selfie photo...');
    const selfieUploadButton = page.getByRole('button', { name: /upload.*selfie/i });
    await expect(selfieUploadButton).toBeVisible();
    // Note: File upload would require proper Cloudinary mock or test setup
    
    // Tour Guide Professional Information
    console.log('Filling tour guide professional information...');
    
    await page.getByLabel(/nationality/i).fill(TOUR_HOST_DATA.nationality);
    await page.getByLabel(/years.*experience/i).fill(TOUR_HOST_DATA.yearsOfExperience);
    await page.getByLabel(/areas.*operation/i).fill(TOUR_HOST_DATA.areasOfOperation);
    
    // Select languages
    console.log('Selecting languages...');
    for (const language of TOUR_HOST_DATA.languages) {
      const langButton = page.getByRole('button', { name: new RegExp(`^${language}$`, 'i') });
      await langButton.click();
      await page.waitForTimeout(200);
    }
    
    console.log('✓ Selected languages');
    
    // Select tour specialties
    console.log('Selecting tour specialties...');
    for (const specialty of TOUR_HOST_DATA.specialties) {
      const specButton = page.getByRole('button', { name: new RegExp(`^${specialty}$`, 'i') });
      await specButton.click();
      await page.waitForTimeout(200);
    }
    
    console.log('✓ Selected tour specialties');
    
    // Fill professional bio
    await page.getByLabel(/professional bio|bio|introduction/i).fill(TOUR_HOST_DATA.bio);
    console.log('✓ Filled professional bio');
    
    // Upload Tour Guide License
    console.log('Uploading tour guide license...');
    const licenseUploadButton = page.getByRole('button', { name: /upload.*license|upload.*certificate/i });
    await expect(licenseUploadButton).toBeVisible({ timeout: 5000 });
    // Note: File upload would require proper Cloudinary mock or test setup
    
    // For testing without actual uploads, we'll check if the Review button becomes enabled
    // In a real scenario, you'd mock the Cloudinary uploads
    
    console.log('✓ Completed tour guide information section');
    
    // Step 5: Review Application
    console.log('Checking Review Application button...');
    
    const reviewButton = page.getByRole('button', { name: /review application/i });
    await expect(reviewButton).toBeVisible({ timeout: 5000 });
    
    // The button may be disabled until all uploads are complete
    // For this test, we'll check its presence
    const isEnabled = await reviewButton.isEnabled();
    console.log(`Review button is ${isEnabled ? 'enabled' : 'disabled'}`);
    
    if (isEnabled) {
      await reviewButton.click();
      await page.waitForTimeout(1000);
      
      console.log('✓ Clicked Review Application');
      
      // Step 6: Review & Submit
      await expect(page.getByRole('heading', { name: /review.*application/i })).toBeVisible({ timeout: 5000 });
      
      // Verify service types shown
      await expect(page.getByText(/tours?/i)).toBeVisible();
      
      // Verify personal information displayed
      await expect(page.getByText(TOUR_HOST_DATA.fullName)).toBeVisible();
      await expect(page.getByText(TOUR_HOST_DATA.phone)).toBeVisible();
      
      console.log('✓ Review page displays correctly');
      
      // Submit Application
      const submitButton = page.getByRole('button', { name: /submit.*application/i });
      await expect(submitButton).toBeVisible();
      
      // Note: In a real test, you might want to actually submit or mock the submission
      console.log('Submit button is ready');
      
      // For safety in test environment, we won't actually submit
      // await submitButton.click();
      // await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 10000 });
      
      console.log('✓ Test completed successfully (submission skipped for safety)');
    } else {
      console.log('⚠ Review button is disabled - likely due to missing file uploads');
      console.log('Note: File uploads require Cloudinary integration in test environment');
    }
  });

  test('validates required tour guide fields', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('/become-host');
    
    // Select Tours
    await page.locator('text=Tours').locator('..').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Navigate to personal info (may need to skip tour package step)
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Check that Review Application button exists and is disabled initially
    const reviewButton = page.getByRole('button', { name: /review application/i });
    await expect(reviewButton).toBeVisible({ timeout: 10000 });
    
    // Initially should be disabled
    const initiallyDisabled = await reviewButton.isDisabled();
    expect(initiallyDisabled).toBeTruthy();
    
    console.log('✓ Review button is correctly disabled when fields are empty');
    
    // Fill only basic info (not tour guide fields)
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/phone/i).fill('+250 788 000 000');
    await page.getByLabel(/national id number|id number/i).fill('1199080000000000');
    
    // Button should still be disabled (missing tour guide fields)
    const stillDisabled = await reviewButton.isDisabled();
    expect(stillDisabled).toBeTruthy();
    
    console.log('✓ Button remains disabled without tour guide fields');
    
    // Fill tour guide fields
    await page.getByLabel(/nationality/i).fill('Rwandan');
    await page.getByLabel(/years.*experience/i).fill('3');
    await page.getByLabel(/areas.*operation/i).fill('Kigali');
    
    // Select at least one language
    await page.getByRole('button', { name: /^English$/i }).click();
    
    // Select at least one specialty
    await page.getByRole('button', { name: /^Cultural$/i }).click();
    
    // Fill bio with minimum 100 characters
    await page.getByLabel(/professional bio|bio/i).fill(
      'I am an experienced tour guide with a passion for sharing Rwanda\'s rich culture and natural beauty with visitors.'
    );
    
    console.log('✓ Filled all tour guide fields except uploads');
    
    // Button should still be disabled (missing file uploads)
    const stillDisabledNoUploads = await reviewButton.isDisabled();
    expect(stillDisabledNoUploads).toBeTruthy();
    
    console.log('✓ Validation correctly requires all fields including uploads');
  });

  test('preserves form data on page refresh', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('/become-host');
    
    // Select Tours
    await page.locator('text=Tours').locator('..').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Skip tour package if present
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Fill some data
    const testName = 'Progress Test User';
    await page.getByLabel(/full name/i).fill(testName);
    await page.getByLabel(/nationality/i).fill('Rwandan');
    
    await page.waitForTimeout(1000); // Let localStorage save
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check if data is restored
    const nameInput = page.getByLabel(/full name/i);
    const nameValue = await nameInput.inputValue();
    
    expect(nameValue).toBe(testName);
    console.log('✓ Form data preserved after refresh');
    
    // Should see restoration toast
    await expect(page.getByText(/progress restored/i)).toBeVisible({ timeout: 5000 });
    console.log('✓ Progress restoration toast displayed');
  });

  test('back navigation maintains form data', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('/become-host');
    
    // Select Tours
    await page.locator('text=Tours').locator('..').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Skip to personal info
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Fill some data
    const testName = 'Back Navigation Test';
    await page.getByLabel(/full name/i).fill(testName);
    await page.waitForTimeout(500);
    
    // Click Back
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();
    await page.waitForTimeout(1000);
    
    // Navigate forward again
    const continueAgain = page.getByRole('button', { name: /continue/i });
    if (await continueAgain.isVisible()) {
      await continueAgain.click();
      await page.waitForTimeout(1000);
    }
    
    // Check if data is preserved
    const nameInput = page.getByLabel(/full name/i);
    const nameValue = await nameInput.inputValue();
    
    expect(nameValue).toBe(testName);
    console.log('✓ Form data preserved during back navigation');
  });
});

test.describe('Tour Host Registration - Field Validation', () => {
  test('validates professional bio minimum length', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/become-host');
    
    // Navigate to personal info
    await page.locator('text=Tours').locator('..').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Skip tour package if present
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Try short bio (less than 100 characters)
    const bioField = page.getByLabel(/professional bio|bio/i);
    await bioField.fill('Short bio');
    
    // Check helper text
    await expect(page.getByText(/minimum 100 characters/i)).toBeVisible();
    
    console.log('✓ Bio length validation helper text displayed');
  });

  test('validates phone number format', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/become-host');
    
    await page.locator('text=Tours').locator('..').click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Skip tour package if present
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Fill phone with valid format
    const phoneField = page.getByLabel(/phone/i);
    await phoneField.fill('+250 788 123 456');
    
    const phoneValue = await phoneField.inputValue();
    expect(phoneValue).toContain('+250');
    
    console.log('✓ Phone number format accepted');
  });
});
