export function createPaymentsApi(client, config = {}) {
  const baseApiUrl = config.baseApiUrl ?? '';

  async function postJson(path, payload) {
    if (!baseApiUrl) {
      throw new Error('Missing baseApiUrl for payments API');
    }
    const response = await fetch(`${baseApiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Payment API request failed: ${response.status}`);
    }
    return data;
  }

  return {
    createFlutterwavePayment(payload) {
      return postJson('/api/flutterwave-create-payment', payload);
    },
    verifyFlutterwavePayment(payload) {
      return postJson('/api/flutterwave-verify-payment', payload);
    },
    createPawaPayPayment(payload) {
      return postJson('/api/pawapay-create-payment', payload);
    },
    checkPawaPayStatus(payload) {
      return postJson('/api/pawapay-check-status', payload);
    },
  };
}
