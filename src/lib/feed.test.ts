import { describe, it, expect } from "vitest";
import { catalogItems, googleXml, metaCsv, type FeedRow } from "./feed";
const product: FeedRow = { id: "parent-1", sku: "IHS-1", name: "Kurti", slug: "kurti", description: "Cotton kurti", short_description: null, price: 900, original_price: 1000, stock: 10, images: ["https://indianhandicraftstandards.com/kurti.jpg"], color: "White", sizes: ["S", "M"] };
describe("Shared storefront catalogs", () => {
  it("retains IDs when SKU changes", () => expect(catalogItems([{ ...product, sku: "NEW-SKU" }])[0].id).toBe("parent-1"));
  it("uses each variation's own price, stock, size and color", () => {
    const [item] = catalogItems([{ ...product, variants: [{ id: "variant-1", sku: "IHS-S", size: "S", color: "Black", stock: 0, price: 1200, sale_price: 999, image_url: null, status: "active" }] }]);
    expect(item.id).toBe("variant-1"); expect(item.groupId).toBe("parent-1"); expect(item.price).toBe("1200.00 INR"); expect(item.salePrice).toBe("999.00 INR"); expect(item.availability).toBe("out of stock"); expect(item.sizes).toBe("S"); expect(item.color).toBe("Black");
  });
  it("omits inactive variations", () => expect(catalogItems([{ ...product, variants: [{ id: "v", sku: null, size: "S", color: null, stock: 5, price: null, sale_price: null, image_url: null, status: "inactive" }] }])).toHaveLength(0));
  it("includes grouping in Google and Meta files", () => { const items = [{ ...catalogItems([product])[0], groupId: "parent-1" }]; expect(googleXml(items)).toContain("<g:item_group_id>parent-1</g:item_group_id>"); expect(metaCsv(items)).toContain("item_group_id"); });
  it("excludes offers with no image from both platforms", () => { const items = catalogItems([{ ...product, images: [] }]); expect(googleXml(items)).not.toContain("<item>"); expect(metaCsv(items).split("\n")).toHaveLength(1); });
});