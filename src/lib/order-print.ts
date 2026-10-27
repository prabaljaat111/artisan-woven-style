// Printable invoice and shipping label. Opens a print window; the browser's "Save as PDF" produces the PDF.
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const rs = (n: unknown) => "₹" + Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const addr = (a: any) => [a?.name, a?.line1 ?? a?.address, a?.line2, a?.landmark, [a?.city, a?.state].filter(Boolean).join(", "), a?.pincode ?? a?.zip, a?.country].filter(Boolean).map(esc).join("<br/>");

function open(title: string, body: string, css: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) throw new Error("Please allow pop-ups to print");
  w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>body{font-family:Georgia,serif;color:#1d2a24;margin:32px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}.r{text-align:right}h1{margin:0;color:#0B3D2E}${css}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function printInvoice(order: any, items: any[]) {
  const rows = items.map((i) => `<tr><td>${esc(i.product_name)}<br/><small>${esc([i.size, i.color].filter(Boolean).join(" · "))}</small></td><td class="r">${i.qty}</td><td class="r">${rs(i.price)}</td><td class="r">${rs(i.qty * Number(i.price))}</td></tr>`).join("");
  open(`Invoice ${order.order_number}`, `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><h1>Indian Handicraft Standards</h1><div>Lucknowi Chikankari · indianhandicraftstandards.com</div></div>
      <div class="r"><h2 style="margin:0">TAX INVOICE</h2><div>Invoice # ${esc(order.order_number)}</div><div>Date: ${new Date(order.created_at).toLocaleDateString("en-IN")}</div></div>
    </div>
    <div style="display:flex;gap:40px;margin:28px 0"><div><b>Bill / Ship to</b><br/>${esc(order.customer_name)}<br/>${addr(order.shipping_address)}<br/>${esc(order.customer_phone)}<br/>${esc(order.customer_email)}</div>
    <div><b>Payment</b><br/>${esc(order.payment_method ?? "—")} · ${esc(order.payment_status)}<br/>${esc(order.payment_reference ?? "")}</div></div>
    <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table style="width:320px;margin-left:auto;margin-top:12px">
      <tr><td>Subtotal</td><td class="r">${rs(order.subtotal)}</td></tr><tr><td>GST</td><td class="r">${rs(order.gst)}</td></tr>
      <tr><td>Shipping</td><td class="r">${rs(order.shipping)}</td></tr>${Number(order.discount) > 0 ? `<tr><td>Discount ${esc(order.coupon_code ?? "")}</td><td class="r">-${rs(order.discount)}</td></tr>` : ""}
      <tr><th>Total</th><th class="r">${rs(order.total)}</th></tr></table>
    <p style="margin-top:40px;font-size:12px">Thank you for supporting handcrafted Chikankari. This is a computer-generated invoice.</p>`, "");
}

export function printLabel(order: any, items: any[]) {
  const qty = items.reduce((a, i) => a + Number(i.qty), 0);
  open(`Label ${order.order_number}`, `
    <div class="label">
      <div style="display:flex;justify-content:space-between"><b>${esc(order.courier_name ?? "Courier")}</b><b>${order.payment_status === "paid" ? "PREPAID" : "COD " + rs(order.total)}</b></div>
      <div class="awb">${esc(order.tracking_number ?? "AWB: ____________")}</div>
      <div><b>DELIVER TO</b><br/><span style="font-size:16px">${esc(order.customer_name)}</span><br/>${addr(order.shipping_address)}<br/>Ph: ${esc(order.customer_phone)}</div>
      <hr/><div><b>FROM</b><br/>Indian Handicraft Standards, Lucknow, Uttar Pradesh</div>
      <hr/><div>Order ${esc(order.order_number)} · ${qty} item(s)</div>
    </div>`, ".label{width:4in;border:2px solid #000;padding:14px;font-family:Arial,sans-serif;font-size:13px}.awb{font-family:monospace;font-size:22px;letter-spacing:2px;border:1px dashed #000;padding:8px;margin:10px 0;text-align:center}");
}
