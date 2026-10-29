import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";


const CreateSchema = z.object({
  order_id: z.string().uuid(),
  payment_token: z.string().regex(/^[a-f0-9]{64}$/),
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");
    const capability = crypto.createHmac("sha256", keySecret).update(`ihs-payment:${data.order_id}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(capability), Buffer.from(data.payment_token))) throw new Error("Payment access denied");

    const { data: order, error: paymentError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, payment_status, payment_method, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.payment_method !== "razorpay" || ["cancelled", "returned", "refunded"].includes(order.status)) throw new Error("Order cannot be paid online");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    // SECURITY: amount is derived from the DB order total, never trusted from the client.
    const amountPaise = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      throw new Error("Invalid order amount");
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: order.order_number ?? order.id,
        notes: { order_id: order.id, order_number: order.order_number ?? "" },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Razorpay order create failed:", text);
      throw new Error("Failed to create payment order");
    }
    const rzpOrder = (await res.json()) as { id: string; amount: number; currency: string };

    await supabaseAdmin
      .from("orders")
      .update({ payment_reference: rzpOrder.id, razorpay_order_id: rzpOrder.id })
      .eq("id", order.id);

    return {
      key_id: keyId,
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      order_number: order.order_number,
    };
  });

const VerifySchema = z.object({
  order_id: z.string().uuid(),
  payment_token: z.string().regex(/^[a-f0-9]{64}$/),
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay not configured");

    const capability = crypto.createHmac("sha256", keySecret).update(`ihs-payment:${data.order_id}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(capability), Buffer.from(data.payment_token))) throw new Error("Payment access denied");
    const { data: linked, error: linkError } = await supabaseAdmin.from("orders").select("razorpay_order_id,payment_method,payment_status,status").eq("id", data.order_id).maybeSingle();
    if (linkError || !linked || linked.payment_method !== "razorpay" || linked.razorpay_order_id !== data.razorpay_order_id || ["cancelled", "returned", "refunded"].includes(linked.status)) throw new Error("Payment is not linked to this order");
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    if (expected !== data.razorpay_signature) {
      throw new Error("Payment signature verification failed");
    }

    // SECURITY: confirm the Razorpay order amount matches the DB order total
    // before marking paid. Prevents tampering even if signature verification
    // is bypassed via an unrelated Razorpay order.
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) throw new Error("Razorpay not configured");
    const { data: dbOrder } = await supabaseAdmin
      .from("orders")
      .select("total")
      .eq("id", data.order_id)
      .single();
    if (!dbOrder) throw new Error("Order not found");
    const expectedPaise = Math.round(Number(dbOrder.total) * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(data.razorpay_order_id)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!rzpRes.ok) throw new Error("Could not verify payment amount");
    const rzpOrder = (await rzpRes.json()) as { amount: number; status: string };
    if (rzpOrder.amount !== expectedPaise) {
      throw new Error("Payment amount mismatch");
    }

    const { data: order, error: paymentError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        status: linked.status === "pending" ? "paid" : linked.status,
        payment_reference: data.razorpay_payment_id,
      })
      .eq("id", data.order_id)
      .select("order_number")
      .single();

    if (paymentError) throw new Error(paymentError.message);

    // Auto-create Shiprocket shipment (non-blocking failure)
    try {
      const { createSrOrderForOrder } = await import("./shiprocket.server");
      await createSrOrderForOrder(data.order_id);
    } catch (e) {
      console.error("Auto Shiprocket create failed:", e);
    }

    return { success: true, order_number: order?.order_number ?? null };
  });