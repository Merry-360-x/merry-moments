/**
 * Shared Type Definitions for Unified Listings
 * Single source of truth for both Web (TypeScript) and Flutter (Dart via codegen)
 */

export type ItemType = 'property' | 'tour' | 'tour_package' | 'transport';

export interface BaseListing {
  id: string;
  item_type: ItemType;
  title: string;
  location: string;
  currency: string;
  images: string[];
  main_image: string | null;
  rating: number | null;
  review_count: number;
  created_at: string;
  is_published: boolean;
}

export interface PropertyListing extends BaseListing {
  item_type: 'property';
  price_per_night: number;
  price_per_month?: number | null;
  monthly_only_listing?: boolean;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  max_guests: number;
  amenities: string[];
  host_id: string;
  check_in_time?: string;
  check_out_time?: string;
  cancellation_policy: string;
  weekly_discount?: number;
  monthly_discount?: number;
}

export interface TourListing extends BaseListing {
  item_type: 'tour';
  price_per_person: number;
  category: string | null;
  duration_days: number;
  created_by: string;
  max_group_size?: number;
}

export interface TourPackageListing extends BaseListing {
  item_type: 'tour_package';
  price_per_person: number;
  price_per_adult?: number;
  city: string;
  country: string;
  category: string | null;
  duration: string | number;
  max_guests: number;
  cover_image: string | null;
  gallery_images: string[];
  host_id: string;
  status: string;
}

export interface TransportListing extends BaseListing {
  item_type: 'transport';
  price_per_day: number;
  provider_name: string | null;
  vehicle_type: string | null;
  seats: number;
  driver_included: boolean;
  image_url: string | null;
  media: string[];
}

export type UnifiedListing = PropertyListing | TourListing | TourPackageListing | TransportListing;

// Type guards
export function isPropertyListing(item: UnifiedListing): item is PropertyListing {
  return item.item_type === 'property';
}

export function isTourListing(item: UnifiedListing): item is TourListing {
  return item.item_type === 'tour';
}

export function isTourPackageListing(item: UnifiedListing): item is TourPackageListing {
  return item.item_type === 'tour_package';
}

export function isTransportListing(item: UnifiedListing): item is TransportListing {
  return item.item_type === 'transport';
}

// Price extraction helpers
export function getListingPrice(item: UnifiedListing): number {
  switch (item.item_type) {
    case 'property':
      return item.price_per_night;
    case 'tour':
      return item.price_per_person;
    case 'tour_package':
      return item.price_per_person ?? item.price_per_adult ?? 0;
    case 'transport':
      return item.price_per_day;
  }
}

export function getListingPriceLabel(item: UnifiedListing, t: (key: string) => string): string {
  switch (item.item_type) {
    case 'property':
      return t('common.perNight');
    case 'tour':
    case 'tour_package':
      return t('common.perPerson');
    case 'transport':
      return t('common.perDay');
  }
}

// Re-export Cloudinary utilities
import {
  resolveListingImageUrl as cloudinaryResolveImageUrl,
  resolveListingImages as cloudinaryResolveImages,
  optimizeCloudinaryImage,
  getResponsiveImageUrl,
  isWorkingImageUrl,
  CLOUDINARY_CONFIG,
} from '@shared-config/cloudinary';

export {
  optimizeCloudinaryImage,
  getResponsiveImageUrl,
  isWorkingImageUrl,
  CLOUDINARY_CONFIG,
};

/**
 * Resolve a single listing image URL to a fully qualified HTTPS URL
 * Uses shared Cloudinary configuration
 */
export function resolveListingImageUrl(raw: string | null | undefined): string | null {
  return cloudinaryResolveImageUrl(raw);
}

/**
 * Resolve all images for a listing (carousel support)
 * Uses shared Cloudinary configuration
 */
export function resolveListingImages(
  images: (string | null | undefined)[] | null | undefined,
  mainImage?: string | null
): string[] {
  return cloudinaryResolveImages(images, mainImage);
}

/**
 * Normalize a raw database row to a UnifiedListing
 * This should match the normalization logic in both Flutter and Web
 */
export function normalizeListing(row: Record<string, unknown>, type: ItemType): UnifiedListing {
  const base = {
    id: String(row.id ?? ''),
    item_type: type,
    title: String(row.title ?? row.name ?? ''),
    location: String(row.location ?? row.city ?? row.provider_name ?? ''),
    currency: String(row.currency ?? 'RWF'),
    images: (row.images as string[]) ?? [],
    main_image: (row.main_image as string) ?? (row.cover_image as string) ?? (row.image_url as string) ?? null,
    rating: row.rating ? Number(row.rating) : null,
    review_count: Number(row.review_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    is_published: Boolean(row.is_published ?? row.status === 'approved'),
  };

  switch (type) {
    case 'property':
      return {
        ...base,
        price_per_night: Number(row.price_per_night ?? 0),
        price_per_month: row.price_per_month ? Number(row.price_per_month) : null,
        monthly_only_listing: Boolean(row.monthly_only_listing),
        property_type: (row.property_type as string) ?? null,
        bedrooms: row.bedrooms ? Number(row.bedrooms) : null,
        bathrooms: row.bathrooms ? Number(row.bathrooms) : null,
        beds: row.beds ? Number(row.beds) : null,
        max_guests: Number(row.max_guests ?? 1),
        amenities: (row.amenities as string[]) ?? [],
        host_id: String(row.host_id ?? ''),
        check_in_time: (row.check_in_time as string) ?? undefined,
        check_out_time: (row.check_out_time as string) ?? undefined,
        cancellation_policy: (row.cancellation_policy as string) ?? 'fair',
        weekly_discount: row.weekly_discount ? Number(row.weekly_discount) : undefined,
        monthly_discount: row.monthly_discount ? Number(row.monthly_discount) : undefined,
      };

    case 'tour':
      return {
        ...base,
        price_per_person: Number(row.price_per_person ?? 0),
        category: (row.category as string) ?? null,
        duration_days: Number(row.duration_days ?? 1),
        created_by: String(row.created_by ?? ''),
        max_group_size: row.max_group_size ? Number(row.max_group_size) : undefined,
      };

    case 'tour_package':
      return {
        ...base,
        price_per_person: Number(row.price_per_person ?? row.price_per_adult ?? 0),
        price_per_adult: row.price_per_adult ? Number(row.price_per_adult) : undefined,
        city: String(row.city ?? ''),
        country: String(row.country ?? ''),
        category: (row.category as string) ?? null,
        duration: row.duration ?? '',
        max_guests: Number(row.max_guests ?? 1),
        cover_image: (row.cover_image as string) ?? null,
        gallery_images: (row.gallery_images as string[]) ?? [],
        host_id: String(row.host_id ?? ''),
        status: String(row.status ?? 'pending'),
      };

    case 'transport':
      return {
        ...base,
        price_per_day: Number(row.price_per_day ?? 0),
        provider_name: (row.provider_name as string) ?? null,
        vehicle_type: (row.vehicle_type as string) ?? null,
        seats: Number(row.seats ?? 0),
        driver_included: Boolean(row.driver_included),
        image_url: (row.image_url as string) ?? null,
        media: (row.media as string[]) ?? [],
      };
  }
}

/**
 * Mobile Sync Payload - matches Flutter's MobileSyncPayload
 */
export interface MobileSyncPayload {
  serverTime: string;
  homeListings: UnifiedListing[];
  stories: Story[];
  profile: UserProfile | null;
  roles: string[];
  bookings: Booking[];
  wishlists: WishlistItem[];
  tripCart: TripCartItem[];
  notifications: Notification[];
}

export interface Story {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  title?: string;
  body?: string;
  location?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  image_url?: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  nickname?: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  loyalty_points?: number;
  currency?: string;
  language?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  guest_id: string | null;
  host_id: string | null;
  property_id: string | null;
  tour_id: string | null;
  transport_id: string | null;
  booking_type: ItemType | 'tour';
  check_in: string | null;
  check_out: string | null;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  listing_title?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  title: string;
  item_type: ItemType;
  property_id?: string;
  tour_id?: string;
  transport_id?: string;
  created_at: string;
}

export interface TripCartItem {
  id: string;
  user_id: string;
  item_type: ItemType;
  reference_id: string;
  quantity: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  channel: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
