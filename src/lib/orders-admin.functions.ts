import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";
import { ORDER_STATUSES, canTransition, mapRazorpayStatus, type OrderStatus } from "./order-workflow";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

const ListInput = z.object({
  status: z.enum(["all", ...ORDER_STATUSES]).default("all"),
  payment: z.enum(["all", "unpaid", "paid", "failed", "refunded"]).default("all"),
  from: z.string().max(40).optional().nullable(),
  to: z.string().max(40).optional().nullable(),
  q: z.string().max(120).optional().nullable(),
  page: z.number().int().min(1).max(1000).default(1),
});

export const ordersList = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => ListInput.parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const size = 25;
    let q = db.from("orders").select("id, order_number, created_at, customer_name, customer_email, customer_phone, total, status, payment_status, payment_method, tracking_number", { count: "exact" });
    if (data.status !== "all") q = q.eq("status", data.status as any);
    if (data.payment !== "all") q = q.eq("payment_status", data.payment);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.q?.trim()) {
      const s = data.q.trim().replace(/[%,()]/g, "");
      q = q.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,customer_phone.ilike.%${s}%`);
    }
    const { data: rows, count, error } = await q.order("created_at", { ascending: false }).range((data.page - 1) * size, data.page * size - 1);
    if (error) throw new Error(error.message);
    const { data: all } = await db.from("orders").select("status");
    const counts: Record<string, number> = {};
    (all ?? []).forEach((r: any) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return { rows: rows ?? [], total: count ?? 0, pageSize: size, counts };
  });

export const orderDetail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const [{ data: order }, { data: items }, { data: events }, { data: shipments }] = await Promise.all([
      db.from("orders").select("*").eq("id", data.id).maybeSingle(),
      db.from("order_items").select("*").eq("order_id", data.id),
      db.from("order_events").select("*").eq("order_id", data.id).order("created_at"),
      db.from("shipments").select("id, provider, awb_code, courier_name, status, label_url, tracking_url, created_at").eq("order_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (!order) throw new Error("Order not found");
    return { order, items: items ?? [], events: events ?? [], shipments: shipments ?? [] };
  });

export const orderSetStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES), note: z.string().max(500).optional().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: o } = await db.from("orders").select("status, tracking_number").eq("id", data.id).maybeSingle();
    if (!o) throw new Error("Order not found");
    if (!canTransition(o.status as OrderStatus, data.status)) throw new Error(`Cannot move an order from ${o.status} to ${data.status}`);
    if (data.status === "shipped" && !o.tracking_number) throw new Error("Add a tracking ID before marking as shipped");
    const patch: any = { status: data.status };
    if (data.status === "refunded") patch.payment_status = "refunded";
    const { error } = await db.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.note?.trim()) await db.from("order_events").insert({ order_id: data.id, kind: "note", message: data.note.trim(), actor_id: (context as any).userId });
    return { ok: true };
  });

export const orderUpdateShipping = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    tracking_number: z.string().trim().max(120).nullable(),
    tracking_url: z.string().trim().max(500).url().nullable().or(z.literal("").transform(() => null)),
    courier_name: z.string().trim().max(80).nullable(),
  }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { id, ...rest } = data;
    const { error } = await db.from("orders").update({ ...rest, tracking_number: rest.tracking_number || null, courier_name: rest.courier_name || null }).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const orderLogEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ id: z.string().uuid(), kind: z.enum(["note", "whatsapp", "invoice", "label"]), message: z.string().trim().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db.from("order_events").insert({ order_id: data.id, kind: data.kind, message: data.message, actor_id: (context as any).userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const orderSyncRazorpay = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured");
    const db = await admin();
    const { data: o } = await db.from("orders").select("id, status, payment_status, payment_reference, razorpay_order_id, total").eq("id", data.id).maybeSingle();
    if (!o) throw new Error("Order not found");
    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const rzpOrder = o.razorpay_order_id ?? (o.payment_reference?.startsWith("order_") ? o.payment_reference : null);
    let payments: { id: string; status: string; amount: number; refund_status?: string | null }[] = [];
    if (rzpOrder) {
      const r = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(rzpOrder)}/payments`, { headers: { Authorization: auth } });
      if (!r.ok) throw new Error(`Razorpay error ${r.status}: ${await r.text()}`);
      payments = ((await r.json()) as any).items ?? [];
    } else if (o.payment_reference?.startsWith("pay_")) {
      const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(o.payment_reference)}`, { headers: { Authorization: auth } });
      if (!r.ok) throw new Error(`Razorpay error ${r.status}: ${await r.text()}`);
      payments = [(await r.json()) as any];
    } else {
      throw new Error("This order has no Razorpay payment linked");
    }
    const statuses = payments.map((p) => (p.refund_status === "full" ? "refunded" : p.status));
    const next = mapRazorpayStatus(statuses);
    const captured = payments.find((p) => p.status === "captured");
    if (next === "paid" && captured && captured.amount !== Math.round(Number(o.total) * 100)) throw new Error("Razorpay amount does not match the order total");
    const patch: any = { payment_status: next };
    if (captured) patch.payment_reference = captured.id;
    if (next === "paid" && o.status === "pending") patch.status = "paid";
    if (next !== o.payment_status || patch.status) {
      const { error } = await db.from("orders").update(patch).eq("id", o.id);
      if (error) throw new Error(error.message);
    }
    return { payment_status: next, changed: next !== o.payment_status, attempts: payments.length };
  });
