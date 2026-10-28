export const SITE_URL = "https://indianhandicraftstandards.com";
export const BRAND = "Indian Handicraft Standards";

export type FeedRow = {
  id: string; name: string; slug: string; sku: string | null; description: string; short_description: string | null;
  price: number; original_price: number; stock: number; images: string[]; color: string | null; sizes: string[];
  category_name?: string | null;
};

export type FeedItem = {
  id: string; title: string; description: string; link: string; image: string; extraImages: string[];
  availability: "in stock" | "out of stock"; price: string; salePrice: string | null; color: string; sizes: string;
  category: string; issues: string[];
};

const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);

export function toFeedItem(r: FeedRow): FeedItem {
  const regular = Math.max(Number(r.original_price) || 0, Number(r.price) || 0);
  const current = Number(r.price) || regular;
  const desc = strip(r.description || r.short_description || "").slice(0, 4900);
  const imgs = (r.images ?? []).filter(Boolean).map(abs);
  const issues: string[] = [];
  if (!imgs.length) issues.push("Missing image");
  if (!desc) issues.push("Missing description");
  if (!regular) issues.push("Missing price");
  if (!r.sku) issues.push("Missing SKU (product ID used)");
  return {
    id: r.sku || r.id,
    title: r.name.slice(0, 150),
    description: desc || r.name,
    link: `${SITE_URL}/product/${r.slug}`,
    image: imgs[0] ?? "",
    extraImages: imgs.slice(1, 10),
    availability: r.stock > 0 ? "in stock" : "out of stock",
    price: `${regular.toFixed(2)} INR`,
    salePrice: current < regular ? `${current.toFixed(2)} INR` : null,
    color: r.color ?? "",
    sizes: (r.sizes ?? []).join(", "),
    category: r.category_name ?? "",
    issues,
  };
}

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function googleXml(items: FeedItem[]) {
  const body = items.filter((i) => i.image).map((i) => [
    "<item>",
    `<g:id>${x(i.id)}</g:id>`, `<g:title>${x(i.title)}</g:title>`, `<g:description>${x(i.description)}</g:description>`,
    `<g:link>${x(i.link)}</g:link>`, `<g:image_link>${x(i.image)}</g:image_link>`,
    ...i.extraImages.map((e) => `<g:additional_image_link>${x(e)}</g:additional_image_link>`),
    `<g:availability>${i.availability}</g:availability>`, `<g:price>${i.price}</g:price>`,
    i.salePrice ? `<g:sale_price>${i.salePrice}</g:sale_price>` : "",
    `<g:brand>${x(BRAND)}</g:brand>`, `<g:condition>new</g:condition>`, `<g:identifier_exists>no</g:identifier_exists>`,
    `<g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>`,
    i.category ? `<g:product_type>${x(i.category)}</g:product_type>` : "",
    i.color ? `<g:color>${x(i.color)}</g:color>` : "",
    i.sizes ? `<g:size>${x(i.sizes.split(", ")[0])}</g:size>` : "",
    `<g:gender>female</g:gender>`, `<g:age_group>adult</g:age_group>`,
    "</item>",
  ].filter(Boolean).join("")).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${x(BRAND)}</title><link>${SITE_URL}</link><description>Product feed</description>\n${body}\n</channel></rss>`;
}

const c = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function metaCsv(items: FeedItem[]) {
  const head = ["id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "additional_image_link", "brand", "color", "size", "product_type", "google_product_category"];
  const rows = items.filter((i) => i.image).map((i) => [
    i.id, i.title, i.description, i.availability, "new", i.price, i.salePrice ?? "", i.link, i.image, i.extraImages.join(","),
    BRAND, i.color, i.sizes.split(", ")[0] ?? "", i.category, "Apparel & Accessories > Clothing",
  ].map((v) => c(String(v))).join(","));
  return [head.join(","), ...rows].join("\n");
}
