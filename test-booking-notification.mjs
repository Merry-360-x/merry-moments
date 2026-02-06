import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.production' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testBookingNotification() {
  console.log("🧪 Starting test booking notification...\n");

  // 1. Find a published property
  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .limit(10);

  if (propError || !properties?.length) {
    console.error("❌ Error finding properties:", propError);
    return;
  }

  // Get first property and fetch host separately
  const property = properties[0];
  
  const { data: host, error: hostError } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", property.host_id)
    .single();

  if (hostError || !host?.email) {
    console.error("❌ No valid host email found:", hostError);
    return;
  }

  property.profiles = host;
  
  console.log(`✅ Found property: ${property.title}`);
  console.log(`   Host: ${host.full_name} (${host.email})\n`);

  // 2. Find or create test user
  const testEmail = "bebisdavy@gmail.com";
  let userId;

  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", testEmail)
    .single();

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✅ Found existing user: ${testEmail}`);
  } else {
    // Create test user
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: {
        full_name: "Test User"
      }
    });

    if (userError) {
      console.error("❌ Error creating user:", userError);
      return;
    }

    userId = newUser.user.id;
    console.log(`✅ Created test user: ${testEmail}`);
  }

  // 3. Create checkout request
  const checkoutData = {
    user_id: userId,
    email: testEmail,
    name: "Test User",
    phone: "+250788123456",
    total_amount: property.price_per_night,
    currency: property.currency || "RWF",
    payment_status: "paid",
    payment_method: "mobile_money",
    dpo_transaction_id: `test-${Date.now()}`,
    metadata: {
      items: [
        {
          item_type: "property",
          reference_id: property.id,
          title: property.title,
          price: property.price_per_night,
          calculated_price: property.price_per_night
        }
      ],
      booking_details: {
        check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        check_out: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
        guests: 2
      }
    }
  };

  const { data: checkout, error: checkoutError } = await supabase
    .from("checkout_requests")
    .insert(checkoutData)
    .select()
    .single();

  if (checkoutError) {
    console.error("❌ Error creating checkout:", checkoutError);
    return;
  }

  console.log(`✅ Created checkout request: ${checkout.id}\n`);

  // 4. Create booking
  const bookingData = {
    guest_id: userId,
    guest_name: "Test User",
    guest_email: testEmail,
    guest_phone: "+250788123456",
    order_id: checkout.id,
    property_id: property.id,
    booking_type: "property",
    check_in: checkoutData.metadata.booking_details.check_in,
    check_out: checkoutData.metadata.booking_details.check_out,
    guests: 2,
    total_price: property.price_per_night,
    currency: property.currency || "RWF",
    status: "confirmed",
    payment_status: "paid",
    payment_method: "mobile_money"
  };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert(bookingData)
    .select()
    .single();

  if (bookingError) {
    console.error("❌ Error creating booking:", bookingError);
    return;
  }

  console.log(`✅ Created booking: ${booking.id}\n`);
  console.log("📧 Now sending email notifications...\n");

  // 5. Send guest email
  const guestEmailHtml = `
    <h1>Booking Confirmed!</h1>
    <p>Dear Test User,</p>
    <p>Your booking has been confirmed.</p>
    <p><strong>Property:</strong> ${property.title}</p>
    <p><strong>Check-in:</strong> ${bookingData.check_in}</p>
    <p><strong>Check-out:</strong> ${bookingData.check_out}</p>
    <p><strong>Guests:</strong> ${bookingData.guests}</p>
    <p><strong>Total:</strong> ${property.price_per_night} ${property.currency || "RWF"}</p>
    <p><strong>Booking Reference:</strong> MRY-${booking.id.slice(0, 8).toUpperCase()}</p>
  `;

  const guestEmailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Merry360X",
        email: "davyncidavy@gmail.com",
      },
      to: [
        {
          email: testEmail,
          name: "Test User",
        },
      ],
      subject: `✅ Booking Confirmed - ${property.title}`,
      htmlContent: guestEmailHtml,
    }),
  });

  const guestResult = await guestEmailResponse.json();
  
  if (guestEmailResponse.ok) {
    console.log(`✅ Guest email sent to ${testEmail}`);
    console.log(`   Message ID: ${guestResult.messageId}\n`);
  } else {
    console.error("❌ Failed to send guest email:", guestResult);
  }

  // 6. Send host email
  const hostEmailHtml = `
    <h1>🔔 New Booking Received!</h1>
    <p>Hi ${property.profiles.full_name},</p>
    <p>You have a new booking for your property.</p>
    <p><strong>Property:</strong> ${property.title}</p>
    <p><strong>Guest:</strong> Test User (${testEmail})</p>
    <p><strong>Check-in:</strong> ${bookingData.check_in}</p>
    <p><strong>Check-out:</strong> ${bookingData.check_out}</p>
    <p><strong>Guests:</strong> ${bookingData.guests}</p>
    <p><strong>Total Amount:</strong> ${property.price_per_night} ${property.currency || "RWF"}</p>
    <p><strong>Booking Reference:</strong> MRY-${booking.id.slice(0, 8).toUpperCase()}</p>
    <br>
    <p>⚠️ <strong>Action Required:</strong> Please prepare your property for the guest.</p>
  `;

  const hostEmailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Merry360X Bookings",
        email: "davyncidavy@gmail.com",
      },
      to: [
        {
          email: property.profiles.email,
          name: property.profiles.full_name,
        },
      ],
      subject: `🔔 New Booking: ${property.title} - MRY-${booking.id.slice(0, 8).toUpperCase()}`,
      htmlContent: hostEmailHtml,
    }),
  });

  const hostResult = await hostEmailResponse.json();
  
  if (hostEmailResponse.ok) {
    console.log(`✅ Host email sent to ${property.profiles.email}`);
    console.log(`   Message ID: ${hostResult.messageId}\n`);
  } else {
    console.error("❌ Failed to send host email:", hostResult);
  }

  console.log("\n🎉 Test completed!");
  console.log("\n📊 Summary:");
  console.log(`   Property: ${property.title}`);
  console.log(`   Guest: ${testEmail}`);
  console.log(`   Host: ${property.profiles.email}`);
  console.log(`   Booking ID: ${booking.id}`);
  console.log(`   Check-in: ${bookingData.check_in}`);
  console.log(`   Check-out: ${bookingData.check_out}`);
}

testBookingNotification().catch(console.error);
