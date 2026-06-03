import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-middleware";

const PincodeSchema = z.string().regex(/^\d{6}$/, "Invalid PIN code");

// ----- PUBLIC: serviceability (used at checkout) -----
export const checkServiceability = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      delivery_postcode: PincodeSchema,
      cod: z.boolean().default(false),
      declared_value: z.number().min(0).max(1_000_000).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { checkServiceabilityRaw, getShiprocketSettings } = await import("./shiprocket.server");
    const settings = await getShiprocketSettings();
    // Use the warehouse PIN from settings; for now lookup via shiprocket pickup nickname is not stored.
    // Default Lucknow atelier PIN
    const pickup = (settings as unknown as { pickup_pincode?: string }).pickup_pincode || "226003";
    try {
      const couriers = await checkServiceabilityRaw({
        pickup_postcode: pickup,
        delivery_postcode: data.delivery_postcode,
        weight: settings.weight_kg,
        cod: data.cod ? 1 : 0,
        declared_value: data.declared_value,
      });
      if (couriers.length === 0) {
        return { serviceable: false, couriers: [] as never[], cheapest: null, fastest: null };
      }
      const cheapest = [...couriers].sort((a, b) => a.rate - b.rate)[0];
      const fastest = [...couriers].sort(
        (a, b) => parseInt(a.estimated_delivery_days || "99") - parseInt(b.estimated_delivery_days || "99"),
      )[0];
      return {
        serviceable: true,
        couriers: couriers.slice(0, 8).map((c) => ({
          id: c.courier_company_id,
          name: c.courier_name,
          rate: c.rate,
          etd: c.etd,
          days: c.estimated_delivery_days,
        })),
        cheapest: { name: cheapest.courier_name, rate: cheapest.rate, days: cheapest.estimated_delivery_days },
        fastest: { name: fastest.courier_name, rate: fastest.rate, days: fastest.estimated_delivery_days },
      };
    } catch (e) {
      return {
        serviceable: false,
        couriers: [] as never[],
        cheapest: null,
        fastest: null,
        error: e instanceof Error ? e.message : "Serviceability check failed",
      };
    }
  });

// ----- INTERNAL: auto-create shipment after order placed/paid -----
export const autoCreateShipment = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { createSrOrderForOrder } = await import("./shiprocket.server");
    try {
      const r = await createSrOrderForOrder(data.order_id);
      return { ok: true, sr_shipment_id: r.sr_shipment_id };
    } catch (e) {
      console.error("autoCreateShipment failed:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Failed" };
    }
  });

// ----- ADMIN -----
export const adminListShipments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("shipments")
      .select("*, order:orders(order_number, customer_name, customer_phone, total, payment_status, shipping_address)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateShipment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { createSrOrderForOrder } = await import("./shiprocket.server");
    return createSrOrderForOrder(data.order_id);
  });

export const adminAssignAwb = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) =>
    z.object({
      shipment_id: z.string().uuid(),
      courier_id: z.number().int().positive().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { assignAwbForShipment } = await import("./shiprocket.server");
    return assignAwbForShipment(data.shipment_id, data.courier_id);
  });

export const adminGeneratePickup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { generatePickupForShipment } = await import("./shiprocket.server");
    return generatePickupForShipment(data.shipment_id);
  });

export const adminGenerateLabel = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { generateLabel } = await import("./shiprocket.server");
    const r = await generateLabel(data.shipment_id);
    return { url: r.url };
  });

export const adminGenerateManifest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { generateManifest } = await import("./shiprocket.server");
    const r = await generateManifest(data.shipment_id);
    return { url: r.url };
  });

export const adminGenerateInvoice = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { generateInvoice } = await import("./shiprocket.server");
    const r = await generateInvoice(data.shipment_id);
    return { url: r.url };
  });

export const adminTrackShipment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { trackByAwb } = await import("./shiprocket.server");
    const { data: row } = await supabaseAdmin
      .from("shipments").select("awb_code").eq("id", data.shipment_id).single();
    const awb = (row as { awb_code: string | null } | null)?.awb_code;
    if (!awb) throw new Error("AWB not assigned yet");
    const tracking = await trackByAwb(awb);
    await supabaseAdmin
      .from("shipments")
      .update({ last_tracking: tracking as never })
      .eq("id", data.shipment_id);
    return { tracking: JSON.stringify(tracking) };
  });

export const adminCancelShipment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ shipment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cancelSrOrder } = await import("./shiprocket.server");
    const { data: row } = await supabaseAdmin
      .from("shipments").select("sr_order_id, order_id").eq("id", data.shipment_id).single();
    const r = row as { sr_order_id: string | null; order_id: string } | null;
    if (!r?.sr_order_id) throw new Error("Shipment has no Shiprocket order ID");
    const resp = await cancelSrOrder(r.sr_order_id);
    await supabaseAdmin
      .from("shipments").update({ status: "cancelled" }).eq("id", data.shipment_id);
    await supabaseAdmin
      .from("orders").update({ status: "cancelled" }).eq("id", r.order_id);
    return { ok: true, response: JSON.stringify(resp) };
  });

// ----- ADMIN SETTINGS -----
export const adminGetShiprocketSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { getShiprocketSettings } = await import("./shiprocket.server");
    return getShiprocketSettings();
  });

const SettingsInput = z.object({
  pickup_location: z.string().min(1).max(80),
  length_cm: z.number().min(1).max(200),
  breadth_cm: z.number().min(1).max(200),
  height_cm: z.number().min(1).max(200),
  weight_kg: z.number().min(0.05).max(50),
  pickup_pincode: z.string().regex(/^\d{6}$/).optional(),
});

export const adminUpdateShiprocketSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => SettingsInput.parse(i))
  .handler(async ({ data }) => {
    const { setShiprocketSettings } = await import("./shiprocket.server");
    return setShiprocketSettings(data);
  });