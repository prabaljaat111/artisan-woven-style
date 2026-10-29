export function saleIsActive(product: { sale_starts_at?: string | null; sale_ends_at?: string | null }, now = Date.now()) {
  return (!product.sale_starts_at || Date.parse(product.sale_starts_at) <= now) && (!product.sale_ends_at || Date.parse(product.sale_ends_at) > now);
}
export function scheduledPrice(product: { price: number | string; original_price?: number | string | null; sale_starts_at?: string | null; sale_ends_at?: string | null }, now = Date.now()) {
  return saleIsActive(product, now) ? Number(product.price) : Number(product.original_price ?? product.price);
}
export type ShippingZone = { states: string[]; pincode_prefixes: string[]; flat_rate: number; free_above: number | null; priority: number; active: boolean; courier: string };
export function zoneShipping(zones: ShippingZone[], state: string, pin: string, subtotal: number) {
  const zone = [...zones].sort((a,b) => b.priority-a.priority).find(z => z.active && (z.states.length === 0 || z.states.some(s=>s.toLowerCase()===state.toLowerCase())) && (z.pincode_prefixes.length === 0 || z.pincode_prefixes.some(p=>pin.startsWith(p))));
  return zone ? { rate: zone.free_above !== null && subtotal >= zone.free_above ? 0 : Number(zone.flat_rate), courier: zone.courier } : null;
}
export function pointBalance(entries: { points: number }[]) { return entries.reduce((sum,row)=>sum+row.points,0); }
export function recoveryStage(updatedAt: string, now = Date.now()) {
  const hours=(now-Date.parse(updatedAt))/3600000;
  return hours>=72 ? 72 : hours>=24 ? 24 : hours>=1 ? 1 : null;
}