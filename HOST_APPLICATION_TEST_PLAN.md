# Host Application Testing Plan

## Test Case: Complete Host Application Flow

### Test Environment
- **URL**: https://merry-moments-c4sx9x9fq-fasts-projects-5b1e7db1.vercel.app
- **Date**: January 13, 2026
- **Feature**: New 4-step host application with service type selection

---

## Test Steps

### 1. Create New Account ✓
- [  ] Navigate to /auth?mode=signup
- [  ] Fill in registration details:
  - Email: test-host-[timestamp]@example.com
  - Password: SecurePass123!
  - Full Name: Test Host User
- [  ] Submit registration
- [  ] Verify successful account creation
- [  ] Verify automatic login after signup

### 2. Navigate to Become a Host ✓
- [  ] Click "Become a Host" in navigation
- [  ] Or navigate directly to /become-host
- [  ] Verify page loads correctly
- [  ] Verify user is authenticated

### 3. Step 1: Service Type Selection ✓
**Test Options:**
- [  ] Click "Accommodation" card
  - Verify card highlights with primary border
  - Verify checkmark appears
  - Verify background changes to primary/5
- [  ] Click "Transport" card
  - Verify multiple selection works
  - Verify both cards remain selected
- [  ] Click "Tours" card
  - Verify all three can be selected simultaneously
- [  ] Unselect one service type
  - Verify deselection works
  - Verify checkmark disappears
- [  ] Try to continue with NO selections
  - Verify "Continue" button is disabled
  - Verify error message appears
- [  ] Select at least one service type
  - Verify "Continue" button becomes enabled
- [  ] Click "Continue"
  - Verify navigation to Step 2

### 4. Step 2: Personal Information ✓
**Required Fields:**
- [  ] Full Name input
  - Enter: "Test Host User"
  - Verify input accepts text
- [  ] Phone Number input
  - Enter: "+250 788 123 456"
  - Verify input accepts phone format
- [  ] National ID Number
  - Enter: "1234567890123456"
  - Verify input accepts numbers
- [  ] ID Photo Upload
  - Click "Upload ID Photo" button
  - Verify CloudinaryUploadDialog opens
  - Select test image file (< 2MB)
  - Verify upload progress shows
  - Verify compression happens (check file size)
  - Verify "ID uploaded" confirmation appears
  - Verify "Remove" button works

**Optional Fields:**
- [  ] About You textarea
  - Enter: "Experienced host passionate about hospitality"
  - Verify 3 rows display

**Navigation:**
- [  ] Try to click "Continue" with missing required fields
  - Verify button is disabled
- [  ] Fill all required fields
  - Verify "Continue" button enables
- [  ] Click "Back" button
  - Verify returns to Step 1
  - Verify service types are still selected
- [  ] Navigate forward again
  - Verify form data persists
- [  ] Click "Continue"
  - Verify navigation to Step 3

### 5. Step 3: Property Details ✓
**Required Fields:**
- [  ] Property Title
  - Enter: "Beautiful 2BR Apartment in Kigali City Center"
  - Verify accepts text
- [  ] Location
  - Enter: "Kigali, Nyarugenge District"
  - Verify MapPin icon displays
- [  ] Property Type dropdown
  - Select: "Apartment"
  - Verify dropdown works
  - Verify other options available
- [  ] Price per Night
  - Enter: 75000
  - Verify accepts numbers only
  - Verify DollarSign icon shows
- [  ] Currency dropdown
  - Select: "RWF"
  - Verify RWF, USD, EUR available
- [  ] Max Guests
  - Enter: 4
  - Verify min="1" validation
  - Verify Users icon shows
- [  ] Bedrooms
  - Enter: 2
  - Verify Bed icon shows
- [  ] Bathrooms
  - Enter: 1
  - Verify Bath icon shows

**Optional Fields:**
- [  ] Description textarea
  - Enter: "Modern apartment with stunning city views..."
  - Verify 4 rows display

**Property Photos:**
- [  ] Click "Add" button
  - Verify CloudinaryUploadDialog opens
  - Upload 3-5 test images
  - Verify multiple upload works
  - Verify images display as thumbnails
  - Verify "×" remove button works
  - Verify at least 1 image required

**Amenities:**
- [  ] Select multiple amenities (WiFi, Parking, AC, Kitchen)
  - Verify selection highlights
  - Verify deselection works
  - Verify grid layout (2 cols mobile, 4 cols desktop)

**Navigation:**
- [  ] Try "Continue" with missing required fields
  - Verify button disabled
- [  ] Fill all required fields + upload 1+ image
  - Verify button enables
- [  ] Click "Back"
  - Verify returns to Step 2
  - Verify personal info persists
- [  ] Navigate forward
  - Verify property details persist
- [  ] Click "Review Application"
  - Verify navigation to Step 4

### 6. Step 4: Review & Submit ✓
**Service Types Card:**
- [  ] Verify selected service types display
- [  ] Verify pills/badges show: "accommodation", "transport", "tour"
- [  ] Verify checkmarks appear
- [  ] Verify capitalization

**Personal Information Card:**
- [  ] Verify Name displays correctly
- [  ] Verify Phone displays correctly
- [  ] Verify ID Number displays correctly
- [  ] Verify grid layout (2 columns on desktop)

**Property Details Card:**
- [  ] Verify Property Title displays
- [  ] Verify Location with MapPin icon
- [  ] Verify first image displays (aspect ratio maintained)
- [  ] Verify Price formatted correctly (formatMoney)
- [  ] Verify "75,000 RWF/night" format
- [  ] Verify Guests, Bedrooms, Bathrooms display
- [  ] Verify 4-column grid on desktop

**Info Banner:**
- [  ] Verify blue info box displays
- [  ] Verify Shield icon shows
- [  ] Verify "Ready to Submit" heading
- [  ] Verify review timeline text

**Navigation:**
- [  ] Click "Back" button
  - Verify returns to Step 3
  - Verify all data persists
- [  ] Navigate to Step 4 again
  - Verify review still accurate

**Submission:**
- [  ] Click "Submit Application" button
  - Verify button shows loading state
  - Verify spinner animation
  - Verify "Submitting..." text
  - Verify button is disabled during submit
- [  ] Wait for submission to complete
  - Verify success toast appears
  - Verify toast title: "Application submitted!"
  - Verify toast description about review
- [  ] Verify page state changes
  - Should show "Application Under Review" card
  - Should show yellow star icon
  - Should show "pending" status

### 7. Post-Submission Verification ✓
**Database Check:**
- [  ] Verify record created in host_applications table
  - service_types array contains selected types
  - full_name matches input
  - phone matches input
  - national_id_number matches input
  - national_id_photo_url has Cloudinary URL
  - listing_title matches input
  - listing_location matches input
  - listing_property_type matches selection
  - listing_price_per_night = 75000
  - listing_currency = "RWF"
  - listing_max_guests = 4
  - listing_bedrooms = 2
  - listing_bathrooms = 1
  - listing_amenities array populated
  - listing_images array with Cloudinary URLs
  - status = "pending"
  - user_id matches authenticated user
  - applicant_type = "individual"
  - created_at timestamp present

**UI State:**
- [  ] Refresh page
  - Verify "Application Under Review" still shows
  - Verify cannot submit duplicate application
- [  ] Navigate away and back
  - Verify status persists
  - Verify pending message shows

**Image Verification:**
- [  ] Check uploaded images in Cloudinary
  - Verify images compressed (should be < 1MB each)
  - Verify proper folder structure
  - Verify images accessible via URL

**Performance Metrics:**
- [  ] Login time < 5 seconds
- [  ] Each image upload < 5 seconds
- [  ] Page navigation instant
- [  ] Form submission < 3 seconds
- [  ] No console errors
- [  ] No network errors

---

## Expected Results

### Success Criteria
✓ User can create account in < 30 seconds
✓ User can select service types (single or multiple)
✓ User cannot proceed without selecting at least one service type
✓ All form validation works correctly
✓ Image compression reduces file sizes by 60-90%
✓ Images upload in < 5 seconds each
✓ All form data persists when navigating back/forward
✓ Review page displays all information accurately
✓ Submission completes successfully
✓ Database record created with all fields
✓ User sees confirmation and pending status
✓ Total flow completion time < 5 minutes

### Failure Conditions
✗ Build errors
✗ Runtime JavaScript errors
✗ Form submission failures
✗ Database constraint violations
✗ Missing required fields allowed
✗ Image upload failures
✗ Login taking > 60 seconds
✗ Image upload taking > 20 seconds
✗ Form data loss on navigation

---

## Test Results
**Status**: READY FOR TESTING
**Deployment**: https://merry-moments-c4sx9x9fq-fasts-projects-5b1e7db1.vercel.app
**Database**: Migration applied successfully
**Build**: Passing ✓

---

## Notes for Testing
1. Use incognito/private browsing to avoid cached auth
2. Test on multiple devices (desktop, mobile, tablet)
3. Test different browsers (Chrome, Firefox, Safari)
4. Test with poor network conditions
5. Test image upload with various file sizes (100KB - 10MB)
6. Test selecting different combinations of service types
7. Monitor browser console for errors
8. Check Network tab for failed requests
9. Verify all Cloudinary uploads complete
10. Check database after each submission

---

## Bug Tracking Template
If issues found:
```
Issue #: ___
Title: ___
Severity: Critical / High / Medium / Low
Steps to Reproduce:
1. 
2. 
3. 
Expected: ___
Actual: ___
Browser: ___
Screenshot: ___
```
