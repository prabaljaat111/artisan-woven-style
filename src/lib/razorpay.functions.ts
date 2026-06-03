import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().int().min(100).max(100_000_000), // in paise
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: data.amount,
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
      .update({ payment_reference: rzpOrder.id })
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
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay not configured");

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    if (expected !== data.razorpay_signature) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", data.order_id);
      throw new Error("Payment signature verification failed");
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        status: "paid",
        payment_reference: data.razorpay_payment_id,
      })
      .eq("id", data.order_id)
      .select("order_number")
      .single();

    // Auto-create Shiprocket shipment (non-blocking failure)
    try {
      const { createSrOrderForOrder } = await import("./shiprocket.server");
      await createSrOrderForOrder(data.order_id);
    } catch (e) {
      console.error("Auto Shiprocket create failed:", e);
    }

    return { success: true, order_number: order?.order_number ?? null };
  });