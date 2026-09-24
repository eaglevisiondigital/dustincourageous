type ObjectValue = Record<string, unknown>;

function object(value: unknown): value is ObjectValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePaymentEvent(value: unknown) {
  if (!object(value)) throw new Error("Expected a payment event object");
  const required = ["provider", "event_id", "order_id", "payment_id", "status"];
  for (const key of required) {
    if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 255) {
      throw new Error("Invalid required payment event fields");
    }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.order_id as string)) {
    throw new Error("Invalid order identifier");
  }
  if (value.status !== "paid") return null;
  if (typeof value.provider_checkout_id !== "string" || !value.provider_checkout_id.trim() ||
    value.provider_checkout_id.length > 255 ||
    typeof value.amount_cents !== "number" || !Number.isSafeInteger(value.amount_cents) || value.amount_cents < 0 ||
    typeof value.currency !== "string" || !/^[A-Za-z]{3}$/.test(value.currency)) {
    throw new Error("Invalid checkout or payment amount verification fields");
  }
  for (const key of ["event_type", "customer_id", "shipping_name"]) {
    if (value[key] != null && (typeof value[key] !== "string" || value[key].length > 255)) {
      throw new Error("Invalid optional payment event fields");
    }
  }
  if (value.shipping_address != null && !object(value.shipping_address)) throw new Error("Invalid shipping address");
  return {
    provider: value.provider as string,
    eventId: value.event_id as string,
    orderId: value.order_id as string,
    paymentId: value.payment_id as string,
    providerCheckoutId: value.provider_checkout_id,
    amountCents: value.amount_cents,
    currency: value.currency.toUpperCase(),
    eventType: (value.event_type as string | undefined) || "payment_succeeded",
    customerId: (value.customer_id as string | null | undefined) ?? null,
    shippingName: (value.shipping_name as string | null | undefined) ?? null,
    shippingAddress: (value.shipping_address as ObjectValue | null | undefined) ?? null,
  };
}

export type PaymentEvent = NonNullable<ReturnType<typeof parsePaymentEvent>>;

// Only a previously committed payment receipt is a safe replay. The order may
// have advanced to shipping or refund handling since that receipt was recorded.
export function isCommittedReplay(event: PaymentEvent, receipt: { order_id: string | null; status: string; payload: unknown }) {
  if (receipt.status !== "processed" || receipt.order_id !== event.orderId) return false;
  try {
    const previous = parsePaymentEvent(receipt.payload);
    return !!previous && previous.provider === event.provider && previous.eventId === event.eventId &&
      previous.orderId === event.orderId && previous.paymentId === event.paymentId &&
      previous.providerCheckoutId === event.providerCheckoutId && previous.amountCents === event.amountCents &&
      previous.currency === event.currency;
  } catch {
    return false;
  }
}
