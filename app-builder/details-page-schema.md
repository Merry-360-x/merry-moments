# Details Page Schema – Tours, Tour Packages, Transport

Use this document to build correct details pages for tours, tour packages, and transport in your mobile app builder. Each section describes the data, zones, validations, and CTA logic.

---

## 1) Tour Details Page

### Data Source
- Table: `tours`
- Select: `id, title, description, location, images, price_per_person, currency, duration, duration_unit, max_group_size, rating, review_count, created_by, is_published, pricing_model, pricing_models, time_pricing_tiers, group_pricing_tiers, metadata, included, not_included, itinerary, languages, meeting_point, start_time, cancellation_policy`
- Filter: `id = [selected tour id]`, `is_published = true`

### Host/Guide Data
- Table: `profiles`
- Select: `user_id, full_name, nickname, avatar_url, bio, years_of_experience, languages_spoken, tour_guide_bio, created_at`
- Filter: `user_id = [tour.created_by]`

### Screen Zones

#### Header Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Image gallery | `images` | Swipeable carousel |
| Title | `title` | |
| Location | `location` | |
| Rating | `rating` | Show stars + numeric |
| Review count | `review_count` | "(X reviews)" |
| Favorite toggle | user favorites | Auth required |
| Share button | – | Native share |

#### Pricing Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Pricing model indicator | `pricing_model` / `pricing_models` | "per person" / "time tiers" / "group tiers" |
| Base price | `price_per_person` | Show when flat model |
| Currency | `currency` | |
| Time tiers | `time_pricing_tiers` | Array: `[{ duration_value, duration_unit, price }]` |
| Group tiers | `group_pricing_tiers` | Array: `[{ min_size, max_size, price_per_person }]` |

**Duration-first UX (when time pricing)**
1. User selects duration tier first.
2. Price updates to selected tier price.
3. Then user selects date/time and participants.

#### Tour Info Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Description | `description` | |
| Duration | `duration`, `duration_unit` | e.g., "3 hours" |
| Max group size | `max_group_size` | |
| Languages | `languages` | Array or string |
| Meeting point | `meeting_point` | |
| Start time | `start_time` | |
| What's included | `included` | Array |
| What's not included | `not_included` | Array |
| Itinerary | `itinerary` | Array of steps or text |
| Cancellation policy | `cancellation_policy` | |

#### Host/Guide Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Avatar | `profiles.avatar_url` | |
| Name | `profiles.full_name` or `nickname` | |
| Bio | `profiles.tour_guide_bio` or `bio` | |
| Experience | `profiles.years_of_experience` | |
| Languages spoken | `profiles.languages_spoken` | |
| Hosting since | `profiles.created_at` | Month/year |

#### Reviews Zone
| Element | Notes |
|---------|-------|
| Review highlights | Top 2-3 reviews |
| "All reviews" link | Navigate to tour reviews screen |

#### Booking Selection Zone
| Input | Validation |
|-------|------------|
| Date | Required; must be future |
| Time (if applicable) | Required if tour has start_time options |
| Number of participants | Required; 1 ≤ value ≤ max_group_size |
| Duration tier (if time pricing) | Required when `time_pricing_tiers` present |

**Total calculation:**
- Flat model: `price_per_person * participants`
- Time tier: selected tier price * participants (or flat if tier price is total)
- Group tier: find tier matching participant count, use `price_per_person * participants` or tier total

#### CTA Zone
| State | Button Text | Action |
|-------|-------------|--------|
| Missing required inputs | "Select date & participants" | Scroll to selection |
| Valid inputs | "Continue" / "Book Now" | Add to cart / checkout |
| Invalid (e.g., exceeds max) | "Unavailable" (disabled) | Show error message |

---

## 2) Tour Package Details Page

### Data Source
- Table: `tour_packages`
- Select: `id, title, description, city, country, cover_image, gallery_images, price_per_adult, price_per_child, currency, duration_days, duration_nights, max_travelers, rating, status, host_id, included, not_included, itinerary, highlights, pricing_model, pricing_models, time_pricing_tiers, group_pricing_tiers, metadata`
- Filter: `id = [selected package id]`, `status = 'published'`

### Host Data
- Table: `profiles`
- Select: `user_id, full_name, avatar_url, bio, created_at`
- Filter: `user_id = [tour_packages.host_id]`

### Screen Zones

#### Header Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Cover image | `cover_image` | Main hero |
| Gallery | `gallery_images` | Swipeable |
| Title | `title` | |
| Location | `city`, `country` | Combined |
| Rating | `rating` | |
| Favorite toggle | user favorites | Auth required |

#### Pricing Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Pricing model indicator | `pricing_model` / `pricing_models` | |
| Price per adult | `price_per_adult` | Flat model |
| Price per child | `price_per_child` | Optional |
| Currency | `currency` | |
| Time tiers | `time_pricing_tiers` | If present |
| Group tiers | `group_pricing_tiers` | If present |

**Same duration-first UX as tours when time pricing applies.**

#### Package Info Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Description | `description` | |
| Duration | `duration_days`, `duration_nights` | e.g., "5 days / 4 nights" |
| Max travelers | `max_travelers` | |
| Highlights | `highlights` | Array |
| What's included | `included` | Array |
| What's not included | `not_included` | Array |
| Daily itinerary | `itinerary` | Array by day |

#### Host Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Avatar | `profiles.avatar_url` | |
| Name | `profiles.full_name` | |
| Bio | `profiles.bio` | |
| Hosting since | `profiles.created_at` | |

#### Booking Selection Zone
| Input | Validation |
|-------|------------|
| Start date | Required; must be future |
| Adults | Required; ≥ 1 |
| Children | Optional; ≥ 0 |
| Total travelers | adults + children ≤ max_travelers |
| Duration tier (if time pricing) | Required when tiers present |

**Total calculation:**
- Flat: `(price_per_adult * adults) + (price_per_child * children)`
- Time/group tiers: apply tier logic same as tours

#### CTA Zone
| State | Button Text | Action |
|-------|-------------|--------|
| Missing required | "Select dates & travelers" | Scroll to selection |
| Valid | "Continue" | Add to cart / checkout |
| Invalid | "Unavailable" (disabled) | Show error |

---

## 3) Transport Details Page

### Data Source – Car Rentals
- Table: `car_rentals`
- Select: `id, title, description, provider_name, vehicle_type, seats, price_per_day, currency, image_url, media, fuel_type, transmission, features, rating, is_published, created_by`
- Filter: `id = [selected id]`, `is_published = true`

### Data Source – Airport Transfers
- Table: `airport_transfers`
- Select: `id, from_location, to_location, description, base_price, currency, vehicle_type, max_passengers, luggage_capacity, includes_meet_greet, rating, is_published, created_by`
- Filter: `id = [selected id]`, `is_published = true`

### Provider Data
- Table: `profiles`
- Select: `user_id, full_name, avatar_url, bio, created_at`
- Filter: `user_id = [transport.created_by]`

### Screen Zones (Car Rental)

#### Header Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Image(s) | `image_url`, `media` | Gallery if multiple |
| Title | `title` | |
| Provider | `provider_name` | |
| Rating | `rating` | |
| Favorite toggle | user favorites | |

#### Vehicle Info Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Description | `description` | |
| Vehicle type | `vehicle_type` | e.g., "SUV" |
| Seats | `seats` | |
| Transmission | `transmission` | |
| Fuel type | `fuel_type` | |
| Features | `features` | Array |

#### Pricing Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Price per day | `price_per_day` | |
| Currency | `currency` | |

#### Booking Selection Zone
| Input | Validation |
|-------|------------|
| Pickup date | Required; future |
| Return date | Required; ≥ pickup date |
| Total days | Calculated |

**Total calculation:** `price_per_day * total_days`

#### CTA Zone
| State | Button Text | Action |
|-------|-------------|--------|
| Missing dates | "Select dates" | Scroll |
| Valid | "Continue" | Add to cart / checkout |

---

### Screen Zones (Airport Transfer)

#### Header Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Route | `from_location` → `to_location` | |
| Rating | `rating` | |
| Favorite toggle | | |

#### Transfer Info Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Description | `description` | |
| Vehicle type | `vehicle_type` | |
| Max passengers | `max_passengers` | |
| Luggage capacity | `luggage_capacity` | |
| Meet & greet | `includes_meet_greet` | Boolean badge |

#### Pricing Zone
| Element | Source Field | Notes |
|---------|--------------|-------|
| Base price | `base_price` | Per trip |
| Currency | `currency` | |

#### Booking Selection Zone
| Input | Validation |
|-------|------------|
| Transfer date | Required; future |
| Transfer time | Required |
| Passengers | Required; 1 ≤ value ≤ max_passengers |

**Total calculation:** `base_price` (flat per trip)

#### CTA Zone
| State | Button Text | Action |
|-------|-------------|--------|
| Missing inputs | "Select date & time" | Scroll |
| Valid | "Continue" | Add to cart / checkout |
| Exceeds capacity | "Unavailable" (disabled) | Show error |

---

## 4) Shared Patterns Across All Details Pages

### Loading State
- Show skeleton placeholders for image, text blocks, and buttons.

### Error State
- Show centered error message with retry button.

### Empty/404 State
- "Item not found" message with back navigation.

### Favorite Toggle
- Requires authentication; prompt login if not signed in.
- Optimistic UI update with rollback on failure.

### Share Functionality
- Native share sheet with item URL/deep link.

### Cart Payload (On Continue)
```json
{
  "item_id": "<id>",
  "item_type": "tour" | "tour_package" | "car_rental" | "airport_transfer",
  "title": "<title>",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "time": "HH:MM" | null,
  "participants": { "adults": N, "children": N } | { "count": N },
  "duration_tier": { ... } | null,
  "unit_price": N,
  "subtotal": N,
  "currency": "XXX"
}
```

---

## 5) Builder Action Checklist

For each details page, configure:
- [ ] Data query with correct table/fields/filters
- [ ] Host/provider profile fetch (joined or separate query)
- [ ] Image gallery component
- [ ] Pricing display logic (flat vs tier)
- [ ] Booking input fields with validation
- [ ] Total calculation formula
- [ ] CTA button state management
- [ ] Add-to-cart action with payload structure
- [ ] Loading/error/empty states
- [ ] Favorite toggle action
- [ ] Share action
