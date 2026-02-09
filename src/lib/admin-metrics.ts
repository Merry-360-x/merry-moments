export type AdminMetricsFlat = {
  users_total: number;
  users_suspended: number;
  hosts_total: number;
  stories_total: number;
  properties_total: number;
  properties_published: number;
  properties_featured: number;
  tours_total: number;
  tours_published: number;
  transport_services_total: number;
  transport_vehicles_total: number;
  transport_vehicles_published: number;
  transport_routes_total: number;
  transport_routes_published: number;
  bookings_total: number;
  bookings_pending: number;
  bookings_confirmed: number;
  bookings_completed: number;
  bookings_cancelled: number;
  bookings_paid: number;
  orders_total: number;
  reviews_total: number;
  reviews_hidden: number;
  tickets_total: number;
  tickets_open: number;
  tickets_in_progress: number;
  tickets_resolved: number;
  incidents_total: number;
  incidents_open: number;
  blacklist_count: number;
  revenue_gross: number;
  revenue_by_currency: Array<{ currency: string; amount: number }>;
  refunds_total: number;
};

// Normalize the result of admin_dashboard_metrics so callers
// can rely on a flat shape, regardless of whether the RPC
// returns nested objects (users.total, bookings.total, ...)
// or a flat JSON with top-level fields.
export function normalizeAdminMetrics(raw: any | null | undefined): AdminMetricsFlat {
  if (!raw || typeof raw !== "object") {
    return defaultMetrics();
  }

  // If it already looks flat, just ensure defaults and return.
  if (typeof (raw as any).users_total === "number") {
    const flat = raw as any;
    return {
      ...defaultMetrics(),
      ...flat,
      revenue_by_currency:
        Array.isArray(flat.revenue_by_currency) && flat.revenue_by_currency.length > 0
          ? flat.revenue_by_currency
          : [
              {
                currency: (flat.revenue_currency as string) || "RWF",
                amount: Number(flat.revenue_gross ?? 0),
              },
            ],
    };
  }

  // Nested JSON shape (current production function)
  const users = (raw as any).users ?? {};
  const hosts = (raw as any).hosts ?? {};
  const props = (raw as any).properties ?? {};
  const tours = (raw as any).tours ?? {};
  const vehicles = (raw as any).vehicles ?? {};
  const bookings = (raw as any).bookings ?? {};
  const revenue = (raw as any).revenue ?? {};
  const refunds = (raw as any).refunds ?? {};
  const reviews = (raw as any).reviews ?? {};
  const orders = (raw as any).orders ?? {};
  const tickets = (raw as any).tickets ?? {};
  const incidents = (raw as any).incidents ?? {};
  const blacklist = (raw as any).blacklist ?? {};
  const stories = (raw as any).stories ?? {};

  const revenueGross = Number(revenue.gross ?? 0);
  const revenueCurrency = String(revenue.currency || "RWF");

  return {
    ...defaultMetrics(),
    users_total: Number(users.total ?? 0),
    users_suspended: Number(users.suspended ?? 0),
    hosts_total: Number(hosts.total ?? 0),
    stories_total: Number(stories.total ?? 0),
    properties_total: Number(props.total ?? 0),
    properties_published: Number(props.published ?? 0),
    properties_featured: Number(props.featured ?? 0),
    tours_total: Number(tours.total ?? 0),
    tours_published: Number(tours.published ?? 0),
    transport_services_total: Number(vehicles.total ?? 0),
    transport_vehicles_total: Number(vehicles.total ?? 0),
    transport_vehicles_published: Number(vehicles.published ?? 0),
    transport_routes_total: 0,
    transport_routes_published: 0,
    bookings_total: Number(bookings.total ?? 0),
    bookings_pending: Number(bookings.pending ?? 0),
    bookings_confirmed: Number(bookings.confirmed ?? 0),
    bookings_completed: Number(bookings.completed ?? 0),
    bookings_cancelled: Number(bookings.cancelled ?? 0),
    bookings_paid: Number(bookings.paid ?? 0),
    orders_total: Number(orders.total ?? 0),
    reviews_total: Number(reviews.total ?? 0),
    reviews_hidden: Number(reviews.hidden ?? 0),
    tickets_total: Number(tickets.total ?? 0),
    tickets_open: Number(tickets.open ?? 0),
    tickets_in_progress: Number(tickets.in_progress ?? 0),
    tickets_resolved: Number(tickets.resolved ?? 0),
    incidents_total: Number(incidents.total ?? 0),
    incidents_open: Number(incidents.open ?? 0),
    blacklist_count: Number(blacklist.total ?? 0),
    revenue_gross: revenueGross,
    revenue_by_currency: [
      {
        currency: revenueCurrency,
        amount: revenueGross,
      },
    ],
    refunds_total: Number(refunds.total ?? 0),
  };
}

function defaultMetrics(): AdminMetricsFlat {
  return {
    users_total: 0,
    users_suspended: 0,
    hosts_total: 0,
    stories_total: 0,
    properties_total: 0,
    properties_published: 0,
    properties_featured: 0,
    tours_total: 0,
    tours_published: 0,
    transport_services_total: 0,
    transport_vehicles_total: 0,
    transport_vehicles_published: 0,
    transport_routes_total: 0,
    transport_routes_published: 0,
    bookings_total: 0,
    bookings_pending: 0,
    bookings_confirmed: 0,
    bookings_completed: 0,
    bookings_cancelled: 0,
    bookings_paid: 0,
    orders_total: 0,
    reviews_total: 0,
    reviews_hidden: 0,
    tickets_total: 0,
    tickets_open: 0,
    tickets_in_progress: 0,
    tickets_resolved: 0,
    incidents_total: 0,
    incidents_open: 0,
    blacklist_count: 0,
    revenue_gross: 0,
    revenue_by_currency: [],
    refunds_total: 0,
  };
}
