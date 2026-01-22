# Tour Enhancement Implementation Status

**Date**: January 22, 2026
**Status**: In Progress

## ✅ Completed

### 1. Database Schema Updates
- ✅ Added `categories` (TEXT[]) field to `tours` table for multiple category support
- ✅ Added `itinerary_pdf_url` (TEXT) field to `tours` table for PDF storage
- ✅ Added `years_of_experience` (INTEGER) to `profiles` table
- ✅ Added `languages_spoken` (TEXT[]) to `profiles` table  
- ✅ Added `tour_guide_bio` (TEXT) to `profiles` table
- ✅ Migrated existing single `category` values to `categories` array
- ✅ Created GIN index on `categories` for better query performance
- ✅ Applied migration to production database

### 2. Type Definitions
- ✅ Regenerated TypeScript types from updated database schema

## 🔄 In Progress / Pending

### 3. Update CreateTour.tsx
**Changes Needed**:
- [ ] Change `category` from string to string[] (`categories`)
- [ ] Replace single Select dropdown with multi-select checkboxes
- [ ] Add PDF upload field for itinerary  
- [ ] Update form submission to save `categories` array instead of single `category`
- [ ] Update to save `itinerary_pdf_url` if PDF uploaded

### 4. Update CreateTourPackage.tsx  
**Changes Needed**:
- [ ] Remove AI-powered PDF extraction feature
- [ ] Keep PDF upload but only store the URL
- [ ] Update to use `categories` array instead of single `category`
- [ ] Simplify form - no data extraction from PDF

### 5. Create TourDetails.tsx Page
**New Page Requirements**:
- [ ] Display full tour information
- [ ] Show embedded PDF viewer if `itinerary_pdf_url` exists
- [ ] "Hosted by" section showing:
  - Host name
  - Years of experience
  - Languages spoken
  - Tour guide bio
- [ ] Tour images gallery
- [ ] Booking/Add to cart functionality
- [ ] Reviews section
- [ ] Similar tours

### 6. Update Tours.tsx
**Changes Needed**:
- [ ] Add click handler to navigate to `/tours/:id`
- [ ] Update to filter by multiple categories
- [ ] Show category badges for multiple categories

### 7. Update HostDashboard.tsx
**Changes Needed**:
- [ ] Update tour creation wizard to support multiple categories
- [ ] Add PDF upload option
- [ ] Update tour editing to handle categories array

### 8. Update HostApplication.tsx
**Changes Needed**:
- [ ] Add fields for tour guide info during registration:
  - Years of experience
  - Languages spoken (multi-select)
  - Tour guide bio (textarea)

### 9. Add Route in App.tsx
**Changes Needed**:
- [ ] Add route: `<Route path="/tours/:id" element={<TourDetails />} />`

### 10. Create TourHost Profile Component
**New Component**:
- [ ] Reusable component showing tour host info
- [ ] Used in TourDetails and potentially standalone `/tour-hosts/:id` page

## Technical Notes

### Multiple Categories Implementation
```typescript
// Old
category: string

// New
categories: string[]

// UI Component
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  {categories.map((cat) => (
    <div key={cat} className="flex items-center space-x-2">
      <Checkbox 
        id={cat}
        checked={formData.categories.includes(cat)}
        onCheckedChange={() => toggleCategory(cat)}
      />
      <Label htmlFor={cat}>{cat}</Label>
    </div>
  ))}
</div>
```

### PDF Viewer Implementation
```typescript
// Display PDF in iframe or use react-pdf library
{tour.itinerary_pdf_url && (
  <div className="my-6">
    <h3 className="text-lg font-semibold mb-3">Tour Itinerary</h3>
    <iframe
      src={tour.itinerary_pdf_url}
      className="w-full h-[600px] border rounded-lg"
      title="Tour Itinerary PDF"
    />
  </div>
)}
```

### Tour Host Info Display
```typescript
// Fetch host profile with tour guide fields
const { data: hostProfile } = useQuery({
  queryKey: ['tour-host', tour.created_by],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, years_of_experience, languages_spoken, tour_guide_bio, avatar_url')
      .eq('id', tour.created_by)
      .single();
    return data;
  }
});

// Display
<div className="border rounded-lg p-6">
  <h3 className="text-lg font-semibold mb-4">Hosted by</h3>
  <div className="flex items-start gap-4">
    <Avatar className="w-16 h-16">
      <AvatarImage src={hostProfile?.avatar_url} />
      <AvatarFallback>{hostProfile?.full_name?.[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <h4 className="font-semibold">{hostProfile?.full_name}</h4>
      {hostProfile?.years_of_experience && (
        <p className="text-sm text-muted-foreground">
          {hostProfile.years_of_experience} years of experience
        </p>
      )}
      {hostProfile?.languages_spoken?.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Speaks: {hostProfile.languages_spoken.join(', ')}
        </p>
      )}
      {hostProfile?.tour_guide_bio && (
        <p className="text-sm mt-2">{hostProfile.tour_guide_bio}</p>
      )}
    </div>
  </div>
</div>
```

## Next Steps

1. Update CreateTour.tsx for multiple categories + PDF upload
2. Remove PDF extraction from CreateTourPackage.tsx  
3. Create TourDetails.tsx page with PDF viewer and host info
4. Add route for tour details
5. Update Tours.tsx to link to detail pages
6. Update host registration to collect tour guide info
7. Test all changes
8. Deploy

## Files to Modify

- `src/pages/CreateTour.tsx`
- `src/pages/CreateTourPackage.tsx`
- `src/pages/Tours.tsx`
- `src/pages/HostDashboard.tsx`
- `src/pages/HostApplication.tsx`
- `src/App.tsx`
- Create: `src/pages/TourDetails.tsx`

## Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] Test tour creation with multiple categories
- [ ] Test PDF upload and display
- [ ] Test tour host profile display
- [ ] Verify mobile responsive design
- [ ] Test on production database
