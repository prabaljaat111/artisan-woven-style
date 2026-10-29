import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutTotals, paymentAllowed } from "./checkout-rules";
import { createHmac } from "node:crypto";
import { scheduledPrice, zoneShipping } from "./growth-rules";
import { getRequestHeader } from '@tanstack/react-start/server';

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
  payment_method: z.enum(["cod", "razorpay"]).default("cod"),
  user_id: z.string().uuid().nullable().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => CreateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bearer=getRequestHeader('authorization')?.replace(/^Bearer /,'');
    let authenticatedUserId: string|null=null;
    if(bearer){const {data:identity,error:identityError}=await supabaseAdmin.auth.getUser(bearer);if(identityError)throw new Error('Please sign in again');authenticatedUserId=identity.user?.id??null;}
    const { readCheckoutRules } = await import("./checkout-rules.server");
    const rules = await readCheckoutRules();
    const signingKey = process.env.RAZORPAY_KEY_SECRET;
    if (data.payment_method === "razorpay" && !signingKey) throw new Error("Online payments are not configured. Please choose another method.");
    const resolved = [];
    for (const item of data.items) {
      let query = supabaseAdmin.from("products").select("id,slug,name,price,original_price,sale_starts_at,sale_ends_at,images,product_type,is_published,stock,allow_backorders,track_inventory").is("deleted_at", null).eq("is_published", true);
      query = item.product_id ? query.eq("id", item.product_id) : query.eq("slug", item.product_slug ?? "");
      const { data: product, error } = await query.maybeSingle();
      if (error || !product) throw new Error(`Product unavailable: ${item.product_name}`);
      const { data: variants, error: variantError } = await supabaseAdmin.from("product_variants").select("size,color,stock,price,sale_price,status").eq("product_id", product.id);
      if (variantError) throw new Error("Could not check product stock");
      const variant = (variants ?? []).find((v) => v.size.toLowerCase() === (item.size ?? "").toLowerCase() && (!v.color || v.color.toLowerCase() === (item.color ?? "").toLowerCase()));
      if ((variants?.length ?? 0) > 0 && (!variant || variant.status === "inactive")) throw new Error(`Selected size/color unavailable: ${product.name}`);
      if (product.track_inventory && !product.allow_backorders && Number(variant?.stock ?? product.stock) < item.qty) throw new Error(`Not enough stock: ${product.name}`);
      const saleActive=scheduledPrice(product)===Number(product.price);
      resolved.push({ ...item, product_id: product.id, product_slug: product.slug, product_name: product.name, price: Number((saleActive?variant?.sale_price:null) ?? variant?.price ?? scheduledPrice(product)) });
    }
    const subtotal = resolved.reduce((s, i) => s + i.qty * i.price, 0);
    if (!paymentAllowed(subtotal, data.payment_method, rules)) throw new Error("This payment method is unavailable for this order amount");

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
      if (coupon && (!coupon.owner_id || coupon.owner_id===authenticatedUserId) && (!coupon.max_uses || coupon.used_count<coupon.max_uses) && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && subtotal >= Number(coupon.min_order)) {
        appliedCoupon = coupon.code;
        discount = coupon.discount_type === "percent"
          ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
          : Math.min(subtotal, Number(coupon.discount_value));
      }
    }

    const zones=await supabaseAdmin.from('shipping_zones').select('*').eq('active',true);
    if(zones.error) throw new Error('Could not check shipping zones');
    const zone=zoneShipping(zones.data??[],data.shipping_address.state??'',data.shipping_address.pincode,subtotal);
    const effectiveRules=zone?{...rules,flat_rate:zone.rate,free_shipping_threshold:Number.MAX_SAFE_INTEGER}:rules;
    const { shipping, gst, total } = checkoutTotals(subtotal, data.payment_method, effectiveRules, discount);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: authenticatedUserId,
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
    if(appliedCoupon){const claimed=await supabaseAdmin.rpc('claim_order_coupon',{_order_id:order.id,_user_id:authenticatedUserId??undefined});if(claimed.error){await supabaseAdmin.from('orders').update({status:'cancelled',notes:'Coupon reservation failed'}).eq('id',order.id);throw new Error('Coupon is unavailable or already used. Please try again without it.');}}

    const items = resolved.map((i) => ({ ...i, order_id: order.id }));
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

    return { order_number: order.order_number, id: order.id, total, payment_token: signingKey ? createHmac("sha256", signingKey).update(`ihs-payment:${order.id}`).digest("hex") : "" };
  });

const TrackSchema = z.object({
  order_number: z.string().min(1).max(40),
  email: z.string().email().max(200),
});

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => TrackSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orderNumber = data.order_number.trim().toUpperCase();
    const email = data.email.trim().toLowerCase();
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, total, tracking_number, tracking_url, created_at, customer_name, shipping_address")
      .ilike("order_number", orderNumber)
      .ilike("customer_email", email)
      .maybeSingle();
    if (!order) throw new Error("No order found with that number + email");
    const [{ data: items }, { data: shipment }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("product_name, product_slug, image, size, color, qty, price")
        .eq("order_id", order.id),
      supabaseAdmin
        .from("shipments")
        .select("status, courier_name, awb_code, tracking_url, last_tracking")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);
    return { ...order, items: items ?? [], shipment: shipment ?? null };
  });
export const checkoutRules = createServerFn({ method: "GET" }).handler(async () => {
  const { readCheckoutRules } = await import("./checkout-rules.server");
  return readCheckoutRules();
});
