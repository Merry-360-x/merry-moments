/**
 * PawaPay payment integration for mobile money payments
 */

export interface PawaPayPaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  paymentMethod: "mtn_momo" | "airtel_money";
  customerName?: string;
  customerEmail?: string;
}

export interface PawaPayPaymentResponse {
  success: boolean;
  depositId?: string;
  status?: string;
  message?: string;
  error?: string;
  data?: {
    bookingId: string;
    depositId: string;
    amount: number;
    currency: string;
    phoneNumber: string;
    correspondent: string;
    status: string;
  };
}

/**
 * Initiate a PawaPay mobile money payment
 */
export async function initiatePawaPayPayment(
  request: PawaPayPaymentRequest
): Promise<PawaPayPaymentResponse> {
  try {
    const response = await fetch("/api/pawapay-create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Payment initiation failed",
        message: data.message || "Please try again or use a different payment method.",
      };
    }

    return {
      success: true,
      depositId: data.depositId,
      status: data.status,
      message: data.message || "Payment initiated. Please check your phone.",
      data: data.data,
    };
  } catch (error) {
    console.error("[PawaPay] Payment initiation error:", error);
    return {
      success: false,
      error: "Network error",
      message: "Could not connect to payment provider. Please try again.",
    };
  }
}

/**
 * Check if a payment method is a PawaPay mobile money method
 */
export function isPawaPayMethod(method: string): boolean {
  return method === "mtn_momo" || method === "airtel_money";
}

/**
 * Get the display name for a payment method
 */
export function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    mtn_momo: "MTN Mobile Money",
    airtel_money: "Airtel Money",
    bank_transfer: "Bank Transfer",
    card: "Credit/Debit Card",
  };
  return names[method] || method;
}
