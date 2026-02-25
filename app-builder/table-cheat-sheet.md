# Merry360X Database Table Cheat Sheet

## 1) `profiles` (app user profile)
**Used for:** user name/phone/avatar and profile completion

**Primary key:** `user_id` (maps to `auth.users.id`)

**Top columns:**
- `user_id`
- `full_name`
- `phone`
- `avatar_url`
- `bio`
- `created_at`

---

## 2) `host_applications` (host onboarding)
**Used for:** becoming a host and approval workflow

**Primary key:** `id`

**Top columns:**
- `id`
- `user_id`
- `status` (`pending`/`approved`/...)
- `service_types` (array)
- `full_name`
- `phone`
- `created_at`
- `accommodation_data` (json)
- `tour_data` (json)
- `tour_package_data` (json)
- `transport_data` (json)

---

## 3) `properties` (accommodation listings)
**Used for:** stays/accommodations shown to guests

**Primary key:** `id`

**Top columns:**
- `id`
- `host_id`
- `title`
- `location`
- `property_type`
- `price_per_night`
- `price_per_month`
- `currency`
- `max_guests`
- `images`
- `is_published`
- `created_at`

---

## 4) `tours` (tour listings)
**Used for:** standard tour products

**Primary key:** `id`

**Top columns:**
- `id`
- `created_by`
- `title`
- `description`
- `location`
- `price_per_person`
- `currency`
- `pricing_tiers` (json)
- `images`
- `is_published`
- `created_at`

---

## 5) `tour_packages` (package tours)
**Used for:** packaged/multi-day tour products

**Primary key:** `id`

**Top columns:**
- `id`
- `host_id`
- `title`
- `city`
- `duration`
- `price_per_adult`
- `currency`
- `pricing_tiers` (json)
- `cover_image`
- `gallery_images`
- `status` (approved/draft)
- `created_at`

---

## 6) `transport_vehicles` (transport listings)
**Used for:** vehicles and transport offers

**Primary key:** `id`

**Top columns:**
- `id`
- `created_by`
- `title`
- `vehicle_type`
- `seats`
- `price_per_day`
- `currency`
- `driver_included`
- `media`
- `is_published`
- `created_at`

---

## 7) `bookings` (orders/bookings)
**Used for:** guest bookings across properties/tours/transport

**Primary key:** `id`

**Top columns:**
- `id`
- `guest_id`
- `booking_type` (`property`/`tour`/`transport`)
- `property_id`
- `tour_id`
- `transport_id`
- `check_in`
- `check_out`
- `guests`
- `total_price`
- `currency`
- `status`
- `order_id`
- `created_at`

---

## 8) `favorites` (saved stays)
**Used for:** wishlist/saved accommodations

**Primary key:** `id`

**Top columns:**
- `id`
- `user_id`
- `property_id`
- `created_at`

---

## Core relationship map (quick)
- `profiles.user_id` → many `host_applications.user_id`
- `profiles.user_id` → many `properties.host_id`
- `profiles.user_id` → many `tours.created_by`
- `profiles.user_id` → many `tour_packages.host_id`
- `profiles.user_id` → many `transport_vehicles.created_by`
- `profiles.user_id` → many `bookings.guest_id`
- `properties.id` → many `bookings.property_id`
- `tours.id` / `tour_packages.id` → many `bookings.tour_id`
- `transport_vehicles.id` → many `bookings.transport_id`

---

## Rule of thumb in code
Whenever you see `supabase.from("table_name")`, that is the table the feature is reading/writing.