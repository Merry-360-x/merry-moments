import { createBackendClient } from './api/client.js';
import { createListingsApi } from './api/listings.js';
import { createBookingsApi } from './api/bookings.js';
import { createAuthApi } from './api/auth.js';
import { createProfileApi } from './api/profile.js';
import { createPaymentsApi } from './api/payments.js';
import { createWishlistApi } from './api/wishlist.js';
import { createNotificationsApi } from './api/notifications.js';
import { createHostApi } from './api/host.js';

export function createMobileSharedSdk(config) {
  const client = createBackendClient(config);

  return {
    client,
    auth: createAuthApi(client),
    profile: createProfileApi(client),
    listings: createListingsApi(client),
    bookings: createBookingsApi(client),
    payments: createPaymentsApi(client, { baseApiUrl: config.baseApiUrl }),
    wishlist: createWishlistApi(client),
    notifications: createNotificationsApi(client),
    host: createHostApi(client),
  };
}
