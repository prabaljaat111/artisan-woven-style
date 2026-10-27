export const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "returned", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed next steps: Processing → Shipped → Delivered, with Cancelled / Returned branches. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT_STATUS[from]?.includes(to) ?? false;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered",
  cancelled: "Cancelled", returned: "Returned", refunded: "Refunded",
};

export const STATUS_TONE: Record<OrderStatus, "green" | "orange" | "red" | "blue"> = {
  pending: "orange", paid: "blue", processing: "orange", shipped: "blue", delivered: "green",
  cancelled: "red", returned: "red", refunded: "red",
};

/** Map a Razorpay payment status to our payment_status. */
export function mapRazorpayStatus(statuses: string[]): "paid" | "failed" | "refunded" | "unpaid" {
  if (statuses.includes("refunded")) return "refunded";
  if (statuses.some((s) => s === "captured")) return "paid";
  if (statuses.length && statuses.every((s) => s === "failed")) return "failed";
  return "unpaid";
}

export function whatsappMessage(o: { customer_name: string; order_number: string; status: string; tracking_number?: string | null; tracking_url?: string | null; courier_name?: string | null }) {
  const name = o.customer_name?.split(" ")[0] || "there";
  const lines: Record<string, string> = {
    processing: `your order ${o.order_number} is confirmed and being prepared by our karigars.`,
    shipped: `your order ${o.order_number} has been shipped${o.courier_name ? ` via ${o.courier_name}` : ""}.${o.tracking_number ? ` Tracking ID: ${o.tracking_number}.` : ""}${o.tracking_url ? ` Track here: ${o.tracking_url}` : ""}`,
    delivered: `your order ${o.order_number} has been delivered. We hope you love it!`,
    cancelled: `your order ${o.order_number} has been cancelled. Any payment made will be refunded.`,
    returned: `we have received the return for order ${o.order_number}.`,
    refunded: `the refund for order ${o.order_number} has been processed.`,
  };
  return `Hi ${name}, ${lines[o.status] ?? `update on your order ${o.order_number}: ${o.status}.`}\n— Indian Handicraft Standards`;
}

/** Indian mobile → digits with country code, or null. */
export function waNumber(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return null;
}
