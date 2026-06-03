// Server-only Shiprocket API client. Never import in client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

interface SrSettings {
  pickup_location: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  weight_kg: number;
}

const DEFAULT_SETTINGS: SrSettings = {
  pickup_location: "Primary",
  length_cm: 25,
  breadth_cm: 20,
  height_cm: 5,
  weight_kg: 0.5,
};

export async function getShiprocketSettings(): Promise<SrSettings> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "shiprocket")
    .maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<SrSettings>) ?? {}) };
}

export async function setShiprocketSettings(patch: Partial<SrSettings>): Promise<SrSettings> {
  const current = await getShiprocketSettings();
  const next = { ...current, ...patch };
  await supabaseAdmin
    .from("app_settings")
    .upsert({ key: "shiprocket", value: next as never });
  return next;
}

interface CachedToken {
  token: string;
  expires_at: number; // ms
}

async function readCachedToken(): Promise<CachedToken | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "shiprocket_token")
    .maybeSingle();
  const v = data?.value as Partial<CachedToken> | undefined;
  if (!v?.token || !v.expires_at) return null;
  return { token: v.token, expires_at: Number(v.expires_at) };
}

async function writeCachedToken(token: string, expires_at: number) {
  await supabaseAdmin
    .from("app_settings")
    .upsert({ key: "shiprocket_token", value: { token, expires_at } as never });
}

export async function getShiprocketToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await readCachedToken();
    if (cached && cached.expires_at > Date.now() + 60_000) return cached.token;
  }
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new Error("Shiprocket credentials not configured");

  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("Shiprocket auth returned no token");
  // Token typically valid for 10 days; cache 9 days to be safe.
  const expires = Date.now() + 9 * 24 * 60 * 60 * 1000;
  await writeCachedToken(json.token, expires);
  return json.token;
}

export async function srFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await getShiprocketToken();
  const res = await fetch(`${SR_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && !retried) {
    await getShiprocketToken(true);
    return srFetch<T>(path, init, true);
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "object" && body && "message" in body
      ? String((body as { message: unknown }).message)
      : text || res.statusText;
    throw new Error(`Shiprocket ${path} failed (${res.status}): ${msg}`);
  }
  return body as T;
}

// ----------- Domain helpers -----------

interface SrServiceabilityCourier {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  estimated_delivery_days: string;
  etd: string;
  cod: number;
  freight_charge: number;
  is_surface: boolean;
}

export async function checkServiceabilityRaw(args: {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number;
  cod: 0 | 1;
  declared_value?: number;
}) {
  const params = new URLSearchParams({
    pickup_postcode: args.pickup_postcode,
    delivery_postcode: args.delivery_postcode,
    weight: String(args.weight),
    cod: String(args.cod),
    ...(args.declared_value ? { declared_value: String(args.declared_value) } : {}),
  });
  const resp = await srFetch<{
    status: number;
    data?: { available_courier_companies?: SrServiceabilityCourier[] };
  }>(`/courier/serviceability/?${params.toString()}`, { method: "GET" });
  return resp.data?.available_courier_companies ?? [];
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

export async function createSrOrderForOrder(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (!items || items.length === 0) throw new Error("Order has no items");

  const o = order as unknown as OrderRow;
  const its = items as unknown as OrderItemRow[];
  const settings = await getShiprocketSettings();
  const addr = o.shipping_address ?? {};
  const isCod = (o.payment_method ?? "").toLowerCase() === "cod";

  const payload = {
    order_id: o.order_number,
    order_date: new Date(o.created_at).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: settings.pickup_location,
    billing_customer_name: (o.customer_name || "Customer").split(" ")[0] || "Customer",
    billing_last_name: (o.customer_name || "").split(" ").slice(1).join(" ") || ".",
    billing_address: addr.line1 ?? "",
    billing_city: addr.city ?? "",
    billing_pincode: addr.pincode ?? "",
    billing_state: addr.state ?? "",
    billing_country: addr.country ?? "India",
    billing_email: o.customer_email,
    billing_phone: (o.customer_phone ?? "").replace(/\D/g, "").slice(-10),
    shipping_is_billing: true,
    order_items: its.map((i) => ({
      name: i.product_name.slice(0, 100),
      sku: (i.product_slug ?? i.product_name).slice(0, 60),
      units: i.qty,
      selling_price: i.price,
    })),
    payment_method: isCod ? "COD" : "Prepaid",
    sub_total: Number(o.subtotal),
    length: settings.length_cm,
    breadth: settings.breadth_cm,
    height: settings.height_cm,
    weight: settings.weight_kg,
  };

  const resp = await srFetch<{
    order_id?: number | string;
    shipment_id?: number | string;
    status?: string;
    status_code?: number;
    message?: string;
  }>("/orders/create/adhoc", { method: "POST", body: JSON.stringify(payload) });

  const sr_order_id = resp.order_id ? String(resp.order_id) : null;
  const sr_shipment_id = resp.shipment_id ? String(resp.shipment_id) : null;

  await supabaseAdmin.from("shipments").upsert(
    {
      order_id: orderId,
      provider: "shiprocket",
      sr_order_id,
      sr_shipment_id,
      status: sr_shipment_id ? "created" : "failed",
      raw: resp as never,
      error: sr_shipment_id ? null : (resp.message ?? "Shiprocket did not return shipment_id"),
    },
    { onConflict: "order_id" },
  );

  return { sr_order_id, sr_shipment_id, raw: resp };
}

export async function assignAwbForShipment(shipmentId: string, courierId?: number) {
  const { data: shipment } = await supabaseAdmin
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();
  if (!shipment) throw new Error("Shipment not found");
  const srShipmentId = (shipment as { sr_shipment_id: string | null }).sr_shipment_id;
  if (!srShipmentId) throw new Error("Shipment missing Shiprocket ID");

  const body: Record<string, unknown> = { shipment_id: srShipmentId };
  if (courierId) body.courier_id = courierId;

  const resp = await srFetch<{
    awb_assign_status?: number;
    response?: { data?: { awb_code?: string; courier_company_id?: number; courier_name?: string } };
    message?: string;
  }>("/courier/assign/awb", { method: "POST", body: JSON.stringify(body) });

  const d = resp.response?.data;
  if (!d?.awb_code) throw new Error(resp.message ?? "AWB assign failed");

  await supabaseAdmin
    .from("shipments")
    .update({
      awb_code: d.awb_code,
      courier_company_id: d.courier_company_id ?? null,
      courier_name: d.courier_name ?? null,
      status: "awb_assigned",
      raw: resp as never,
    })
    .eq("id", shipmentId);

  // Mirror to orders for legacy tracking display
  await supabaseAdmin
    .from("orders")
    .update({
      tracking_number: d.awb_code,
      tracking_url: `https://shiprocket.co/tracking/${d.awb_code}`,
      status: "shipped",
    })
    .eq("id", (shipment as { order_id: string }).order_id);

  return d;
}

export async function generatePickupForShipment(shipmentId: string) {
  const { data: shipment } = await supabaseAdmin
    .from("shipments").select("*").eq("id", shipmentId).single();
  if (!shipment) throw new Error("Shipment not found");
  const srShipmentId = (shipment as { sr_shipment_id: string | null }).sr_shipment_id;
  if (!srShipmentId) throw new Error("Missing Shiprocket shipment ID");

  const resp = await srFetch<{
    pickup_status?: number;
    response?: { pickup_scheduled_date?: string; pickup_token_number?: string | number };
    message?: string;
  }>("/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify({ shipment_id: [Number(srShipmentId)] }),
  });

  const r = resp.response;
  await supabaseAdmin
    .from("shipments")
    .update({
      status: "pickup_scheduled",
      pickup_scheduled_date: r?.pickup_scheduled_date ?? null,
      pickup_token_number: r?.pickup_token_number ? String(r.pickup_token_number) : null,
      raw: resp as never,
    })
    .eq("id", shipmentId);
  return resp;
}

async function generateUrl(
  shipmentId: string,
  path: string,
  field: "label_url" | "manifest_url" | "invoice_url",
  payload: Record<string, unknown>,
  responseField: string,
) {
  const resp = await srFetch<Record<string, unknown>>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const url = resp[responseField] as string | undefined;
  if (url) await supabaseAdmin.from("shipments").update({ [field]: url } as never).eq("id", shipmentId);
  return { url: url ?? null, raw: resp };
}

export async function generateLabel(shipmentId: string) {
  const { data } = await supabaseAdmin.from("shipments").select("sr_shipment_id").eq("id", shipmentId).single();
  const sr = (data as { sr_shipment_id: string | null } | null)?.sr_shipment_id;
  if (!sr) throw new Error("Missing Shiprocket shipment ID");
  return generateUrl(shipmentId, "/courier/generate/label", "label_url",
    { shipment_id: [Number(sr)] }, "label_url");
}

export async function generateManifest(shipmentId: string) {
  const { data } = await supabaseAdmin.from("shipments").select("sr_shipment_id").eq("id", shipmentId).single();
  const sr = (data as { sr_shipment_id: string | null } | null)?.sr_shipment_id;
  if (!sr) throw new Error("Missing Shiprocket shipment ID");
  return generateUrl(shipmentId, "/manifests/generate", "manifest_url",
    { shipment_id: [Number(sr)] }, "manifest_url");
}

export async function generateInvoice(shipmentId: string) {
  const { data } = await supabaseAdmin.from("shipments").select("sr_order_id").eq("id", shipmentId).single();
  const sr = (data as { sr_order_id: string | null } | null)?.sr_order_id;
  if (!sr) throw new Error("Missing Shiprocket order ID");
  return generateUrl(shipmentId, "/orders/print/invoice", "invoice_url",
    { ids: [Number(sr)] }, "invoice_url");
}

export async function trackByAwb(awb: string) {
  const resp = await srFetch<Record<string, unknown>>(`/courier/track/awb/${encodeURIComponent(awb)}`, { method: "GET" });
  return resp;
}

export async function cancelSrOrder(srOrderId: string) {
  return srFetch<Record<string, unknown>>("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: [Number(srOrderId)] }),
  });
}