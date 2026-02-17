/**
 * Availability and Auto-Confirmation Algorithm
 * Checks availability of properties, tours, packages, and transport
 * Automatically confirms bookings when items are available
 */

import { supabase } from "@/integrations/supabase/client";

export type ItemType = "property" | "tour" | "tour_package" | "transport";

export interface AvailabilityCheck {
  itemId: string;
  itemType: ItemType;
  checkIn?: string;
  checkOut?: string;
  quantity?: number;
}

export interface AvailabilityResult {
  itemId: string;
  itemType: ItemType;
  available: boolean;
  reason?: string;
  autoConfirm: boolean;
}

/**
 * Check if a property is available for the given dates
 */
async function checkPropertyAvailability(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<{ available: boolean; reason?: string }> {
  // Check if property exists and is published
  // @ts-ignore - Supabase type inference issue
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, is_published")
    .eq("id", propertyId)
    .single();

  if (error || !property) {
    return { available: false, reason: "Property not found" };
  }

  // @ts-ignore - Supabase type inference issue
  if (!property.is_published) {
    return { available: false, reason: "Property not published" };
  }

  // Check for conflicting bookings
  // @ts-ignore - Supabase type inference issue
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", propertyId)
    .in("status", ["confirmed", "pending"])
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  if (conflicts && conflicts.length > 0) {
    return { available: false, reason: "Already booked for these dates" };
  }

  return { available: true };
}

/**
 * Check if a tour is available
 */
async function checkTourAvailability(
  tourId: string
): Promise<{ available: boolean; reason?: string }> {
  // @ts-ignore - Supabase type inference issue
  const { data: tour, error } = await supabase
    .from("tours")
    .select("id, is_published")
    .eq("id", tourId)
    .single();

  if (error || !tour) {
    return { available: false, reason: "Tour not found" };
  }

  // @ts-ignore - Supabase type inference issue
  if (!tour.is_published) {
    return { available: false, reason: "Tour not published" };
  }

  return { available: true };
}

/**
 * Check if a tour package is available
 */
async function checkTourPackageAvailability(
  packageId: string
): Promise<{ available: boolean; reason?: string }> {
  // @ts-ignore - Supabase type inference issue
  const { data: pkg, error } = await supabase
    .from("tour_packages")
    .select("id, status")
    .eq("id", packageId)
    .single();

  if (error || !pkg) {
    return { available: false, reason: "Package not found" };
  }

  // @ts-ignore - Supabase type inference issue
  if (pkg.status !== "approved") {
    return { available: false, reason: "Package not approved" };
  }

  return { available: true };
}

/**
 * Check if transport is available
 */
async function checkTransportAvailability(
  transportId: string
): Promise<{ available: boolean; reason?: string }> {
  // @ts-ignore - Supabase type inference issue
  const { data: transport, error } = await supabase
    .from("transport_vehicles")
    .select("id, is_published")
    .eq("id", transportId)
    .single();

  if (error || !transport) {
    return { available: false, reason: "Transport not found" };
  }

  // @ts-ignore - Supabase type inference issue
  if (!transport.is_published) {
    return { available: false, reason: "Transport not published" };
  }

  return { available: true };
}

/**
 * Check availability for multiple items
 */
export async function checkAvailability(
  items: AvailabilityCheck[]
): Promise<AvailabilityResult[]> {
  const results: AvailabilityResult[] = [];

  for (const item of items) {
    let result: { available: boolean; reason?: string };

    switch (item.itemType) {
      case "property":
        if (!item.checkIn || !item.checkOut) {
          result = { available: false, reason: "Missing check-in/check-out dates" };
        } else {
          result = await checkPropertyAvailability(item.itemId, item.checkIn, item.checkOut);
        }
        break;

      case "tour":
        result = await checkTourAvailability(item.itemId);
        break;

      case "tour_package":
        result = await checkTourPackageAvailability(item.itemId);
        break;

      case "transport":
        result = await checkTransportAvailability(item.itemId);
        break;

      default:
        result = { available: false, reason: "Unknown item type" };
    }

    results.push({
      itemId: item.itemId,
      itemType: item.itemType,
      available: result.available,
      reason: result.reason,
      autoConfirm: result.available, // Auto-confirm if available
    });
  }

  return results;
}

/**
 * Auto-confirm a booking if all items are available
 */
export async function autoConfirmBooking(
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  // Get booking details
  // @ts-ignore - Supabase type inference issue
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { success: false, message: "Booking not found" };
  }

  // Check if property is available
  // @ts-ignore - Supabase type inference issue
  const availability = await checkPropertyAvailability(
    booking.property_id,
    booking.check_in,
    booking.check_out
  );

  if (!availability.available) {
    return { success: false, message: availability.reason || "Not available" };
  }

  // Auto-confirm the booking
  // @ts-ignore - Supabase type inference issue
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, message: "Failed to confirm booking" };
  }

  return { success: true, message: "Booking auto-confirmed successfully" };
}
