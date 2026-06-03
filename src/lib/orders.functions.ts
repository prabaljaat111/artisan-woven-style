import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1).max(300),
  product_slug: z.string().max(300).optional().nullable(),
  image: z.string().max(2000).optional().nullable(),
  size: z.string().max(40).optional().nullable(),
  color: z.string().max(80).optional().nullable(),
  qty: z.number().int().min(1).max(99),
  price: z.number().min(0).max(1_000_000),
});

const CreateOrderSchema = z.object({
  customer_name: z.string().min(1).max(120),
  customer_email: z.string().email().max(200),
  customer_phone: z.string().min(5).max(20),
  shipping_address: z.object({
    line1: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional().default(""),
    pincode: z.string().min(3).max(10),
    country: z.string().max(60).default("India"),
  }),
  items: z.array(ItemSchema).min(1).max(50),
  coupon_code: z.string().max(40).optional().nullable(),
  payment_method: z.string().max(40).default("cod"),
  user_id: z.string().uuid().nullable().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => CreateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const subtotal = data.items.reduce((s, i) => s + i.qty * i.price, 0);
    const shipping = subtotal === 0 || subtotal > 999 ? 0 : 79;
    const gst = Math.round(subtotal * 0.05);

    // Coupon
    let discount = 0;
    let appliedCoupon: string | null = null;
    if (data.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", data.coupon_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();
      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && subtotal >= Number(coupon.min_order)) {
        appliedCoupon = coupon.code;
        discount = coupon.discount_type === "percent"
          ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
          : Math.min(subtotal, Number(coupon.discount_value));
      }
    }

    const total = Math.max(0, subtotal + gst + shipping - discount);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.user_id ?? null,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        shipping_address: data.shipping_address,
        subtotal, gst, shipping, discount, total,
        coupon_code: appliedCoupon,
        payment_method: data.payment_method,
        status: "pending",
        payment_status: data.payment_method === "cod" ? "unpaid" : "unpaid",
      })
      .select("*")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Failed to create order");

    const items = data.items.map((i) => ({ ...i, order_id: order.id }));
    const { error: ie } = await supabaseAdmin.from("order_items").insert(items);
    if (ie) throw new Error(ie.message);

    // For COD orders, auto-push to Shiprocket immediately
    if (data.payment_method === "cod") {
      try {
        const { createSrOrderForOrder } = await import("./shiprocket.server");
        await createSrOrderForOrder(order.id);
      } catch (e) {
        console.error("Auto Shiprocket create (COD) failed:", e);
      }
    }

    return { order_number: order.order_number, id: order.id, total };
  });

const TrackSchema = z.object({
  order_number: z.string().min(1).max(40),
  email: z.string().email().max(200),
});

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => TrackSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, status, payment_status, total, tracking_number, tracking_url, created_at, customer_name, shipping_address")
      .eq("order_number", data.order_number.trim())
      .eq("customer_email", data.email.trim().toLowerCase())
      .maybeSingle();
    if (!order) throw new Error("No order found with that number + email");
    return order;
  });