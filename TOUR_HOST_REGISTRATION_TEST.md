# Tour Host Registration Test Guide

## Test Date: January 22, 2026
## Environment: https://merry360x.com

---

## Test Scenario: Register as a Tour Guide Host

### Prerequisites
- User must be logged in
- User should NOT have an existing host application

---

## Step-by-Step Test Process

### Step 1: Navigate to Application
1. Go to https://merry360x.com
2. Click **"Become a Host"** button (in navbar or homepage)
3. Verify you're on `/become-host` page

**Expected Result:** ✅ Application form loads with Step 1 visible

---

### Step 2: Select Service Type
1. On **Step 1: Select Services**, click on **"Tours"** card
2. Verify the card is highlighted with primary color border
3. Verify checkmark appears on the Tours card
4. Click **"Continue"** button

**Expected Result:** ✅ Tours card is selected, Continue button is enabled, advances to Step 2

---

### Step 3: Fill Tour Package Details (Optional)
**Note:** This step appears if you want to pre-create a tour package

1. **Tour Title:** Enter "Gorilla Trekking Experience"
2. **Location:** Enter "Volcanoes National Park, Musanze"
3. **Description:** Enter detailed tour description (minimum text)
4. **Category:** Select from dropdown (Adventure, Cultural, Wildlife, etc.)
5. **Duration:** Enter number of days (e.g., "3")
6. **Difficulty:** Select difficulty level
7. **Price per Person:** Enter amount
8. **Currency:** Select currency (RWF, USD, etc.)
9. **Max Group Size:** Enter number (e.g., "10")
10. **Upload Tour Images:** Click upload and add at least 1 image
11. Click **"Continue"** to proceed

**Expected Result:** ✅ All fields save correctly, advances to Personal Information step

---

### Step 4: Personal Information & Tour Guide Details

#### Basic Personal Information
1. **Full Name:** Enter your full name
2. **Phone Number:** Enter phone (format: +250 XXX XXX XXX)
3. **National ID Number:** Enter your ID number
4. **Upload National ID Photo:** Click and upload clear ID photo
5. **Upload Selfie Photo:** Click and upload a recent selfie

#### Tour Guide Professional Information
*These fields appear because "Tours" was selected*

6. **Nationality:** Enter "Rwandan" (or your nationality)
7. **Years of Experience:** Enter number (e.g., "5")
8. **Areas of Operation:** Enter cities/regions (e.g., "Kigali, Musanze, Rubavu")
9. **Languages Spoken:** Click to select multiple:
   - English
   - French
   - Kinyarwanda
   - Swahili (optional)
   - Other languages as applicable

10. **Tour Specialties:** Click to select multiple:
    - Cultural
    - Adventure
    - Wildlife
    - City Tours
    - Hiking
    - Photography
    - Historical
    - Eco-Tourism

11. **Professional Bio:** Write minimum 100 characters about:
    - Your experience as a tour guide
    - Your passion for tourism
    - What makes you unique
    - Example: "I am a certified tour guide with 5 years of experience showcasing the beauty of Rwanda. My passion is connecting visitors with our rich culture, stunning wildlife, and warm hospitality. I specialize in gorilla trekking expeditions and cultural immersion tours."

12. **Upload Tour Guide License/Certificate:** 
    - Click "Upload License/Certificate"
    - Upload your RDB tourism certificate (PDF or image)
    - Wait for "License uploaded" green confirmation
    - **Important:** Dialog should close automatically after upload

13. Click **"Review Application"** button

**Expected Result:** 
- ✅ All fields filled correctly
- ✅ Review Application button becomes clickable (pink/primary color)
- ✅ Certificate upload shows green confirmation
- ✅ Advances to Review step

---

### Step 5: Review & Submit

1. **Verify Service Types:** Should show "tour" badge
2. **Verify Personal Information:** 
   - Name
   - Phone
   - ID Number

3. **Verify Tour Guide Information (if tour package was added):**
   - Tour title
   - Location
   - Images
   - Pricing

4. **Review all information for accuracy**
5. Click **"Submit Application"** button
6. Wait for confirmation toast

**Expected Result:** 
- ✅ All information displays correctly
- ✅ Submit button works
- ✅ Success toast appears: "Application submitted!"
- ✅ Redirected to appropriate page or shown confirmation

---

## Validation Checks

### Required Fields Validation
The "Review Application" button should remain **disabled** until ALL of these are filled:

- ✅ Full Name
- ✅ Phone
- ✅ National ID Number
- ✅ National ID Photo uploaded
- ✅ Selfie Photo uploaded
- ✅ Nationality (tour-specific)
- ✅ Years of Experience (tour-specific)
- ✅ Areas of Operation (tour-specific)
- ✅ At least 1 Language Selected (tour-specific)
- ✅ At least 1 Tour Specialty Selected (tour-specific)
- ✅ Professional Bio (min 100 chars) (tour-specific)
- ✅ Tour Guide License uploaded (tour-specific)

### Database Verification
After submission, check Supabase `host_applications` table:

```sql
SELECT 
  id,
  user_id,
  status,
  service_types,
  full_name,
  phone,
  nationality,
  languages_spoken,
  years_of_experience,
  areas_of_operation,
  tour_specialties,
  tour_guide_bio,
  tour_guide_license_url,
  tour_data,
  created_at
FROM host_applications
WHERE service_types @> '["tour"]'::jsonb
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Data:**
- ✅ `service_types` contains "tour"
- ✅ All tour guide fields populated
- ✅ `tour_guide_license_url` has Cloudinary URL
- ✅ `status` = "pending"
- ✅ `tour_data` JSON contains tour package details (if filled)

---

## Known Issues & Resolutions

### Issue 1: Review Button Not Clickable
**Fix Applied:** Tour guide fields now update at root level of formData, not nested in tour object

### Issue 2: License Upload Dialog Not Closing
**Fix Applied:** Dialog now closes automatically after successful upload

### Issue 3: Excessive Console Logs
**Fix Applied:** Optimized with useMemo hooks, removed debug logs

### Issue 4: WebSocket Connection Errors
**Fix Applied:** Cleaned .env file to remove newline characters from API key

---

## Test Results

### Test Run #1: [Date/Time]
- **Tester:** 
- **Status:** [ ] Pass / [ ] Fail
- **Notes:**

### Test Run #2: [Date/Time]
- **Tester:** 
- **Status:** [ ] Pass / [ ] Fail
- **Notes:**

---

## Edge Cases to Test

1. **Back Navigation:** Click "Back" button at any step
   - ✅ Should preserve filled data
   - ✅ Should return to previous step

2. **Progress Saving:** Refresh page mid-application
   - ✅ Should restore progress from localStorage
   - ✅ Should show toast "Progress Restored"

3. **Existing Application:** Try to apply again after submitting
   - ✅ Should show existing application status
   - ✅ Should not allow duplicate submission

4. **Multiple Service Types:** Select Tours + Transport
   - ✅ Should show both service detail steps
   - ✅ Should collect all required fields
   - ✅ Total steps = 5 (Service → Tour → Transport → Personal → Review)

---

## Success Criteria

All of the following must be true:

- ✅ User can select "Tours" service type
- ✅ Tour package details form displays (optional step)
- ✅ All tour guide fields display in Personal Information step
- ✅ Tour guide license upload works
- ✅ Certificate upload dialog closes after upload
- ✅ Review Application button enables after all required fields filled
- ✅ Review page shows all entered information
- ✅ Submit button works without errors
- ✅ Success toast displays
- ✅ Data saves correctly to database
- ✅ All tour-specific fields persist in database
- ✅ No console errors during process
- ✅ No WebSocket connection errors

---

## Production URL
https://merry360x.com/become-host

## Database Access
Supabase Project: uwgiostcetoxotfnulfm
Table: `host_applications`

---

## Notes
- LocalStorage key: `host_application_progress`
- Tour guide fields are mandatory only when "tour" is in service_types
- RDB certificate must be uploaded (required field)
- Professional bio must be at least 100 characters
