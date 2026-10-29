export type CapturedPayment = { order_id: string; amount: number; currency: string; status: string; captured: boolean };

export function isCapturedPayment(payment: CapturedPayment, orderId: string, amount: number): boolean {
  return payment.order_id === orderId && payment.amount === amount && payment.currency === "INR" && payment.status === "captured" && payment.captured === true;
}