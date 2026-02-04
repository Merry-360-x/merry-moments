// Supabase Edge Function to send email notification when a support ticket is created
// Deploy with: supabase functions deploy send-ticket-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPPORT_EMAIL = "support@merry360x.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailData {
  category: string;
  subject: string;
  message: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

function generateTicketEmailHtml(ticket: TicketEmailData): string {
  const categoryColors: Record<string, string> = {
    general: "#3b82f6",
    booking: "#10b981",
    payment: "#f59e0b",
    technical: "#8b5cf6",
    account: "#ec4899",
  };

  const color = categoryColors[ticket.category] || "#6b7280";
  const createdAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="padding: 24px; background-color: #dc2626; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">🎫 New Support Ticket</h1>
      </td>
    </tr>
    
    <!-- Alert Banner -->
    <tr>
      <td style="padding: 16px 24px; background-color: #fef3c7; border-bottom: 1px solid #fcd34d;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">⚡ Action Required - Customer needs help</p>
      </td>
    </tr>
    
    <!-- Category Badge -->
    <tr>
      <td style="padding: 24px 24px 16px 24px;">
        <span style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          ${ticket.category}
        </span>
        <span style="display: inline-block; margin-left: 8px; color: #6b7280; font-size: 13px;">
          ${createdAt}
        </span>
      </td>
    </tr>
    
    <!-- Subject -->
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <h2 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${ticket.subject}</h2>
      </td>
    </tr>
    
    <!-- Message -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border-left: 4px solid ${color};">
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${ticket.message}</p>
        </div>
      </td>
    </tr>
    
    <!-- Customer Info -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Customer Details</p>
          <p style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px;"><strong>Name:</strong> ${ticket.userName || "Not provided"}</p>
          <p style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${ticket.userEmail}" style="color: #3b82f6;">${ticket.userEmail}</a></p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;"><strong>User ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.userId}</code></p>
        </div>
      </td>
    </tr>
    
    <!-- Reply CTA -->
    <tr>
      <td style="padding: 0 24px 24px 24px; text-align: center;">
        <a href="https://merry360x.com/customer-support-dashboard" 
           style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View in Dashboard
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated notification from Merry360X Support System</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: TicketEmailData = await req.json();

    // Validate required fields
    if (!data.subject || !data.message || !data.userId || !data.userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If Brevo API key is not configured, skip email but don't fail
    if (!BREVO_API_KEY) {
      console.log("⚠️ Brevo API key not configured, skipping email notification");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No API key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = generateTicketEmailHtml(data);

    // Send email via Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry360X Support",
          email: "noreply@merry360x.com",
        },
        to: [
          {
            email: SUPPORT_EMAIL,
            name: "Merry360X Support Team",
          },
        ],
        replyTo: {
          email: data.userEmail,
          name: data.userName || "Customer",
        },
        subject: `🎫 [${data.category.toUpperCase()}] ${data.subject}`,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Support notification sent for ticket: ${data.subject}`);
      return new Response(
        JSON.stringify({ ok: true, messageId: result.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("❌ Brevo API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("❌ Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
