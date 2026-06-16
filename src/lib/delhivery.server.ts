// Server-only Delhivery One Platform API client. Used as a fallback when
// Shiprocket order creation fails. Never import in client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DLV_BASE = "https://track.delhivery.com";

interface DlvSettings {
  pickup_location: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  weight_kg: number;
  pickup_pincode: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_country?: string;
  pickup_phone?: string;
  pickup_email?: string;
  registered_name?: string;
}

const DEFAULT_DLV: DlvSettings = {
  pickup_location: "Primary",
  length_cm: 25,
  breadth_cm: 20,
  height_cm: 5,
  weight_kg: 0.5,
  pickup_pincode: "226003",
  pickup_address: "Indian Handicraft Standards Atelier, Chowk",
  pickup_city: "Lucknow",
  pickup_state: "Uttar Pradesh",
  pickup_country: "India",
  pickup_phone: "9999999999",
  pickup_email: "support@indianhandicraftstandards.com",
  registered_name: "Indian Handicraft Standards",
};

export async function getDelhiverySettings(): Promise<DlvSettings> {
  // Reuse Shiprocket settings as defaults (same parcel dims/warehouse) and
  // allow a `delhivery` key in app_settings to override.
  const { data: dlv } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "delhivery").maybeSingle();
  const { data: sr } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "shiprocket").maybeSingle();
  return {
    ...DEFAULT_DLV,
    ...((sr?.value as Partial<DlvSettings>) ?? {}),
    ...((dlv?.value as Partial<DlvSettings>) ?? {}),
  };
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: Record<string, string>;
  subtotal: number;
  total: number;
  discount: number;
  payment_method: string | null;
  created_at: string;
}
interface OrderItemRow {
  product_name: string;
  product_slug: string | null;
  qty: number;
  price: number;
  size: string | null;
}

export async function createDelhiveryOrderForOrder(orderId: string) {
  const token = process.env.DELHIVERY_API_TOKEN;
  if (!token) throw new Error("DELHIVERY_API_TOKEN not configured");

  const { data: order } = await supabaseAdmin
    .from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Order not found");
  const { data: items } = await supabaseAdmin
    .from("order_items").select("*").eq("order_id", orderId);
  if (!items || items.length === 0) throw new Error("Order has no items");

  const o = order as unknown as OrderRow;
  const its = items as unknown as OrderItemRow[];
  const settings = await getDelhiverySettings();
  const addr = o.shipping_address ?? {};
  const isCod = (o.payment_method ?? "").toLowerCase() === "cod";
  const totalWeightG = Math.max(100, Math.round(settings.weight_kg * 1000));
  const productsDesc = its.map((i) => `${i.product_name} x${i.qty}`).join(", ").slice(0, 250);

  const shipment = {
    name: o.customer_name || "Customer",
    add: addr.line1 ?? "",
    pin: addr.pincode ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    country: addr.country ?? "India",
    phone: (o.customer_phone ?? "").replace(/\D/g, "").slice(-10),
    order: o.order_number,
    payment_mode: isCod ? "COD" : "Prepaid",
    return_pin: settings.pickup_pincode,
    return_city: "",
    return_phone: "",
    return_add: "",
    return_state: "",
    return_country: "India",
    products_desc: productsDesc,
    hsn_code: "",
    cod_amount: isCod ? String(Number(o.total)) : "0",
    order_date: new Date(o.created_at).toISOString().slice(0, 19),
    total_amount: String(Number(o.total)),
    seller_add: "",
    seller_name: "Indian Handicraft Standards",
    seller_inv: "",
    quantity: String(its.reduce((s, i) => s + i.qty, 0)),
    waybill: "",
    shipment_width: String(settings.breadth_cm * 10),
    shipment_height: String(settings.height_cm * 10),
    weight: String(totalWeightG),
    seller_gst_tin: "",
    shipping_mode: "Surface",
    address_type: "home",
  };

  const body = new URLSearchParams();
  body.set("format", "json");
  body.set(
    "data",
    JSON.stringify({
      shipments: [shipment],
      pickup_location: { name: settings.pickup_location },
    }),
  );

  const doCreate = async () => {
    const r = await fetch(`${DLV_BASE}/api/cmu/create.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Token ${token}`,
      },
      body: body.toString(),
    });
    const t = await r.text();
    let j: Record<string, unknown> = {};
    try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
    return { http: r, resp: j };
  };

  let { http: res, resp } = await doCreate();
  let pkgs = (resp as { packages?: Array<{ waybill?: string; status?: string; remarks?: string[] }> }).packages ?? [];
  let first = pkgs[0];
  let waybill = first?.waybill ?? null;
  let ok = res.ok && Boolean(waybill) && (first?.status?.toLowerCase() !== "fail");

  // If warehouse isn't registered yet, auto-register it once and retry.
  const errBlob = JSON.stringify(resp).toLowerCase();
  if (!ok && (errBlob.includes("clientwarehouse") || errBlob.includes("warehouse"))) {
    const reg = await registerDelhiveryWarehouse(settings);
    if (reg.ok) {
      ({ http: res, resp } = await doCreate());
      pkgs = (resp as { packages?: Array<{ waybill?: string; status?: string; remarks?: string[] }> }).packages ?? [];
      first = pkgs[0];
      waybill = first?.waybill ?? null;
      ok = res.ok && Boolean(waybill) && (first?.status?.toLowerCase() !== "fail");
    } else {
      throw new Error(
        `Delhivery pickup warehouse "${settings.pickup_location}" is not registered, ` +
        `and auto-registration failed: ${reg.error}. ` +
        `Please create a warehouse named "${settings.pickup_location}" in your Delhivery One dashboard ` +
        `(Settings → Warehouse) with PIN ${settings.pickup_pincode}.`,
      );
    }
  }

  if (!ok) {
    const msg = first?.remarks?.join("; ") || (resp as { rmk?: string }).rmk || `Delhivery create failed (${res.status})`;
    await supabaseAdmin.from("shipments").upsert(
      {
        order_id: orderId,
        provider: "delhivery",
        status: "failed",
        raw: resp as never,
        error: msg,
      },
      { onConflict: "order_id" },
    );
    throw new Error(msg);
  }

  await supabaseAdmin.from("shipments").upsert(
    {
      order_id: orderId,
      provider: "delhivery",
      sr_order_id: waybill,
      sr_shipment_id: waybill,
      awb_code: waybill,
      courier_name: "Delhivery",
      status: "awb_assigned",
      raw: resp as never,
      error: null,
    },
    { onConflict: "order_id" },
  );

  await supabaseAdmin.from("orders").update({
    tracking_number: waybill,
    tracking_url: `https://www.delhivery.com/track/package/${waybill}`,
    status: "shipped",
  }).eq("id", orderId);

  return { waybill, raw: resp };
}

export async function trackDelhiveryWaybill(waybill: string) {
  const token = process.env.DELHIVERY_API_TOKEN;
  if (!token) throw new Error("DELHIVERY_API_TOKEN not configured");
  const res = await fetch(
    `${DLV_BASE}/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`,
    { headers: { Authorization: `Token ${token}`, Accept: "application/json" } },
  );
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}