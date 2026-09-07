// Future provider receives a persisted order, never client prices.
// Implement verified, replay-safe webhooks and atomic payment state transitions.
// A redirect or browser request must never mark an order paid.
export const paymentAdapter = {
  enabled: false,
  async createSession(_persistedOrder) { throw new Error('Payments are disabled. No charge was created.') },
}
