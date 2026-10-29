export type CheckoutRules = { cod_enabled: boolean; cod_min: number; cod_max: number; cod_fee: number; razorpay_enabled: boolean; flat_rate: number; free_shipping_threshold: number };
export const DEFAULT_CHECKOUT_RULES: CheckoutRules = { cod_enabled: true, cod_min: 0, cod_max: 50000, cod_fee: 0, razorpay_enabled: true, flat_rate: 79, free_shipping_threshold: 999 };
export function checkoutTotals(subtotal: number, method: string, rules: CheckoutRules, discount = 0) {
  const shipping = subtotal === 0 || subtotal > rules.free_shipping_threshold ? 0 : rules.flat_rate;
  const gst = Math.round(subtotal * 0.05);
  const fee = method === "cod" ? rules.cod_fee : 0;
  return { subtotal, shipping: shipping + fee, gst, discount, total: Math.max(0, subtotal + shipping + fee + gst - discount) };
}
export function paymentAllowed(subtotal: number, method: string, rules: CheckoutRules) {
  if (method === "razorpay") return rules.razorpay_enabled;
  return method === "cod" && rules.cod_enabled && subtotal >= rules.cod_min && subtotal <= rules.cod_max;
}