export default {
  routes: [
    {
      method: 'POST',
      path: '/billing/checkout',
      handler: 'billing.checkout',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/billing/webhook',
      handler: 'billing.webhook',
      config: {
        // Public — NOWPayments не отправляет наш JWT. Защита через HMAC внутри controller'а.
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/billing/pricing',
      handler: 'billing.pricing',
      config: {
        auth: false,
      },
    },
  ],
}
