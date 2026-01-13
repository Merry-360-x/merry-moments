# Become a Host - Required Input Fields

## Step 1: Service Type Selection

### Service Types (Required - Select at least 1)
- **Accommodation** - Hotels, apartments, villas, guesthouses
- **Transport** - Vehicle rentals, shuttle services  
- **Tours** - Guided tours, experiences, activities

**Format**: Click cards to select/deselect  
**Validation**: Must select at least one service type  
**Example**: Select "Accommodation" only, or multiple like "Accommodation + Transport"

---

## Step 2: Personal Information

### Full Name (Required)
- **Type**: Text input
- **Format**: First and last name
- **Validation**: Non-empty string
- **Example**: `John Doe` or `Jane Smith`

### Phone Number (Required)
- **Type**: Tel input
- **Format**: International format with country code
- **Validation**: Non-empty string
- **Example**: `+250 788 123 456` or `+1 555 123 4567`

### National ID Number (Required)
- **Type**: Text input
- **Format**: Alphanumeric ID number
- **Validation**: Non-empty string
- **Example**: `1234567890123456` or `ID-ABC-123456`

### ID Photo (Required)
- **Type**: Image upload
- **Format**: JPEG, PNG, WebP
- **File Size**: Any size (auto-compressed to < 1MB)
- **Validation**: At least 1 photo required
- **Note**: Image will be automatically compressed before upload

### About You (Optional)
- **Type**: Textarea (3 rows)
- **Format**: Free text
- **Validation**: None (optional field)
- **Example**: `Experienced host with 5 years in hospitality. I love meeting new people and sharing my city's culture.`

---

## Step 3: Property Details

### Property Title (Required)
- **Type**: Text input
- **Format**: Descriptive title
- **Validation**: Non-empty string
- **Example**: `Cozy 2BR Apartment in City Center` or `Modern Villa with Pool`

### Location (Required)
- **Type**: Text input with MapPin icon
- **Format**: City, District or Address
- **Validation**: Non-empty string
- **Example**: `Kigali, Nyarugenge District` or `Nairobi, Westlands`

### Property Type (Required)
- **Type**: Dropdown select
- **Options**: 
  - Hotel
  - Apartment
  - Villa
  - Guesthouse
  - Resort
  - Lodge
  - House
- **Default**: Apartment
- **Example**: Select `Villa`

### Price per Night (Required)
- **Type**: Number input
- **Format**: Positive number (no decimals needed)
- **Validation**: Must be > 0
- **Example**: `75000` (RWF) or `100` (USD)

### Currency (Required)
- **Type**: Dropdown select
- **Options**: RWF, USD, EUR
- **Default**: RWF
- **Example**: Select `RWF`

### Max Guests (Required)
- **Type**: Number input
- **Format**: Positive integer
- **Validation**: Minimum 1
- **Example**: `4` (for 4 people)

### Bedrooms (Required)
- **Type**: Number input
- **Format**: Positive integer
- **Validation**: Minimum 1
- **Example**: `2` (for 2 bedrooms)

### Bathrooms (Required)
- **Type**: Number input
- **Format**: Positive integer
- **Validation**: Minimum 1
- **Example**: `1` (for 1 bathroom)

### Description (Optional)
- **Type**: Textarea (4 rows)
- **Format**: Free text
- **Validation**: None (optional field)
- **Example**: `Modern apartment with stunning city views. Features include high-speed WiFi, fully equipped kitchen, and spacious living area. Located near shopping centers and restaurants.`

### Property Photos (Required)
- **Type**: Multiple image upload
- **Format**: JPEG, PNG, WebP
- **File Size**: Any size (auto-compressed to < 1MB each)
- **Validation**: At least 1 photo required
- **Recommended**: 3-5 photos showing different rooms
- **Note**: Images will be automatically compressed before upload

### Amenities (Optional)
- **Type**: Multi-select buttons
- **Format**: Click to select/deselect
- **Options Available**:
  - WiFi
  - Parking
  - Air Conditioning (AC)
  - Kitchen
  - Pool
  - Gym
  - TV
  - Washer
  - (and more...)
- **Validation**: None (optional)
- **Example**: Select `WiFi`, `Parking`, `AC`, `Kitchen`

---

## Step 4: Review & Submit

**No input fields** - This step displays all entered information for review before submission.

- Review service types selected
- Review personal information
- Review property details
- Click "Submit Application" to complete

---

## Quick Reference Table

| Field | Type | Required | Example |
|-------|------|----------|---------|
| Service Types | Selection | ✅ Yes | Accommodation, Transport |
| Full Name | Text | ✅ Yes | John Doe |
| Phone | Tel | ✅ Yes | +250 788 123 456 |
| ID Number | Text | ✅ Yes | 1234567890123456 |
| ID Photo | Image | ✅ Yes | id-photo.jpg |
| About | Textarea | ❌ No | Brief bio... |
| Property Title | Text | ✅ Yes | Cozy 2BR Apartment |
| Location | Text | ✅ Yes | Kigali, Nyarugenge |
| Property Type | Dropdown | ✅ Yes | Apartment |
| Price/Night | Number | ✅ Yes | 75000 |
| Currency | Dropdown | ✅ Yes | RWF |
| Max Guests | Number | ✅ Yes | 4 |
| Bedrooms | Number | ✅ Yes | 2 |
| Bathrooms | Number | ✅ Yes | 1 |
| Description | Textarea | ❌ No | Property description... |
| Photos | Images | ✅ Yes | photo1.jpg, photo2.jpg |
| Amenities | Multi-select | ❌ No | WiFi, Parking, AC |

---

## Sample Complete Form Data

```javascript
{
  // Step 1
  "service_types": ["accommodation", "transport"],
  
  // Step 2
  "full_name": "John Doe",
  "phone": "+250 788 123 456",
  "national_id_number": "1234567890123456",
  "national_id_photo_url": "https://res.cloudinary.com/...photo.jpg",
  "about": "Experienced host passionate about hospitality",
  
  // Step 3
  "title": "Beautiful 2BR Apartment with City Views",
  "location": "Kigali, Nyarugenge District",
  "property_type": "Apartment",
  "price_per_night": 75000,
  "currency": "RWF",
  "max_guests": 4,
  "bedrooms": 2,
  "bathrooms": 1,
  "description": "Modern apartment with stunning views...",
  "images": [
    "https://res.cloudinary.com/...photo1.jpg",
    "https://res.cloudinary.com/...photo2.jpg",
    "https://res.cloudinary.com/...photo3.jpg"
  ],
  "amenities": ["wifi", "parking", "ac", "kitchen"]
}
```

---

## Important Notes

### Image Uploads
- ✅ **Automatic Compression**: All images compressed to < 1MB before upload
- ✅ **Fast Upload**: Each image uploads in 2-5 seconds
- ✅ **Multiple Formats**: Accepts JPEG, PNG, WebP, GIF
- ✅ **Quality**: 85% quality maintained (visually identical)
- ✅ **Dimensions**: Auto-scaled to max 1920px width/height

### Form Validation
- ✅ **Real-time**: Buttons disabled until required fields filled
- ✅ **Clear Feedback**: Required fields marked with *
- ✅ **Error Messages**: Shows which fields need attention
- ✅ **Data Persistence**: Form data saved when navigating back/forward

### Performance
- ✅ **Fast Navigation**: Each step loads instantly
- ✅ **Quick Uploads**: Images upload 75-85% faster than before
- ✅ **Smooth Experience**: No lag or delays

---

## What Happens After Submission?

1. ✅ Application saved to database
2. ✅ Status set to "pending"
3. ✅ You'll see "Application Under Review" message
4. ✅ Cannot submit duplicate applications
5. ✅ Admin team will review within 1-3 business days
6. ✅ You'll receive email notification when approved
7. ✅ After approval, access Host Dashboard to manage properties
