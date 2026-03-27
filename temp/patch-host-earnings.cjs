const fs = require('fs');
const path = '/Users/davy/merry-moments/src/pages/HostDashboard.tsx';
let text = fs.readFileSync(path, 'utf8');

const oldReportBlock = `  const filteredReportBookings = useMemo(() => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return bookings || [];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return (bookings || []).filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return Number.isFinite(bookingDate.getTime()) && bookingDate >= start && bookingDate <= end;
    });
  }, [bookings, reportStartDate, reportEndDate]);`;

const newReportBlock = `  const isEarningsEligibleBooking = useCallback((booking: Booking) => {
    const status = String(booking.status || "").toLowerCase();
    const payment = normalizePaymentStatus(booking);

    // Some historical bookings remain in non-final booking statuses even when payment succeeded.
    // Treat successful payment as eligible unless there is a refund signal.
    const hasSuccessfulPayment = ["paid", "completed", "success", "successful", "captured"].includes(payment);
    const isConfirmed = status === "confirmed" || status === "completed";
    const isUnpaidFlow = ["failed", "pending", "requested", "unpaid", "not_paid", "expired"].includes(payment);
    const isRefundFlow = payment === "requested" || payment === "refunded" || payment.includes("refund");

    return (isConfirmed || hasSuccessfulPayment) && !isRefundFlow && !isUnpaidFlow;
  }, [normalizePaymentStatus]);

  const earningsEligibleBookings = useMemo(() => {
    return (bookings || []).filter((booking) => isEarningsEligibleBooking(booking));
  }, [bookings, isEarningsEligibleBooking]);

  const filteredReportBookings = useMemo(() => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return earningsEligibleBookings;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return earningsEligibleBookings.filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return Number.isFinite(bookingDate.getTime()) && bookingDate >= start && bookingDate <= end;
    });
  }, [earningsEligibleBookings, reportStartDate, reportEndDate]);`;

const oldConfirmedBlock = `  const confirmedBookings = (bookings || []).filter((b) => {
    const status = String(b.status || "").toLowerCase();
    const payment = normalizePaymentStatus(b);

    // Some historical bookings remain in non-final booking statuses even when payment succeeded.
    // Treat successful payment as eligible unless there is a refund signal.
    const hasSuccessfulPayment = ["paid", "completed", "success", "successful", "captured"].includes(payment);
    const isConfirmed = status === "confirmed" || status === "completed";
    const isUnpaidFlow = ["failed", "pending", "requested", "unpaid", "not_paid", "expired"].includes(payment);
    const isRefundFlow = payment === "requested" || payment === "refunded" || payment.includes("refund");

    return (isConfirmed || hasSuccessfulPayment) && !isRefundFlow && !isUnpaidFlow;
  });`;

const newConfirmedBlock = `  const confirmedBookings = earningsEligibleBookings;`;

if (!text.includes(oldReportBlock)) {
  throw new Error('Missing report block');
}
if (!text.includes(oldConfirmedBlock)) {
  throw new Error('Missing confirmed block');
}

text = text.replace(oldReportBlock, newReportBlock);
text = text.replace(oldConfirmedBlock, newConfirmedBlock);

fs.writeFileSync(path, text);
console.log('patched host earnings');
