// @ts-ignore bun test runner module
import { describe, it, expect } from "bun:test";
import { autoMap, parseRows, leafCategory, buildExportRows } from "./woo-csv";

const headers = ["Type", "SKU", "Name", "Regular price", "Sale price", "Categories", "Stock", "Parent", "Attribute 1 name", "Attribute 1 value(s)"];
const map = autoMap(headers);
const row = (o: Record<string, string>) => Object.fromEntries(headers.map((h) => [h, o[h] ?? ""]));
const opts = { knownCategories: ["Kurtis"], createMissingCategories: false };

describe("woo csv import validation", () => {
  it("flags missing SKU", () => {
    const [r] = parseRows([row({ Type: "simple", Name: "A", "Regular price": "100", Categories: "Kurtis" })], map, opts);
    expect(r.errors).toContain("Missing SKU");
  });
  it("flags invalid price", () => {
    const [r] = parseRows([row({ Type: "simple", SKU: "X1", Name: "A", "Regular price": "abc", Categories: "Kurtis" })], map, opts);
    expect(r.errors).toContain("Invalid price");
  });
  it("flags unknown category unless create-missing is on", () => {
    const data = [row({ Type: "simple", SKU: "X1", Name: "A", "Regular price": "100", Categories: "Lehengas" })];
    expect(parseRows(data, map, opts)[0].errors).toContain('Unknown category "Lehengas"');
    expect(parseRows(data, map, { ...opts, createMissingCategories: true })[0].errors).toEqual([]);
  });
  it("links a variation to its parent row", () => {
    const rows = parseRows([
      row({ Type: "variable", SKU: "P1", Name: "Kurti", Categories: "Kurtis" }),
      row({ Type: "variation", SKU: "P1-S", Parent: "P1", "Regular price": "999", "Attribute 1 name": "Size", "Attribute 1 value(s)": "S" }),
      row({ Type: "variation", SKU: "P2-S", Parent: "P2", "Regular price": "999", "Attribute 1 name": "Size", "Attribute 1 value(s)": "S" }),
    ], map, opts);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toEqual([]);
    expect(rows[1].size).toBe("S");
    expect(rows[2].errors).toContain('Parent "P2" not found');
  });
  it("uses the leaf of a category path", () => {
    expect(leafCategory("Women > Kurtis, Sale")).toBe("Kurtis");
  });
});

describe("woo csv export", () => {
  it("writes a variable parent followed by variation rows pointing to parent SKU", () => {
    const rows = buildExportRows([{ id: "1", sku: "P1", name: "Kurti", is_published: true, featured: false, short_description: "", description: "", stock: 5, original_price: 1000, price: 1000, category: "Kurtis", images: [], product_type: "variable", weight: null, length_cm: null, width_cm: null, height_cm: null, sizes: [], colors: [],
      variants: [{ sku: "P1-S", size: "S", color: null, stock: 5, price: 900, sale_price: null, image_url: null, status: "active" }] }]);
    expect(rows.map((r) => r.Type)).toEqual(["variable", "variation"]);
    expect(rows[1].Parent).toBe("P1");
    expect(rows[1]["Regular price"]).toBe(900);
  });
});
