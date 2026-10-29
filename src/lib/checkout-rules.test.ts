import { describe, it, expect } from "vitest";
import { DEFAULT_CHECKOUT_RULES, checkoutTotals, paymentAllowed } from "./checkout-rules";
import { analyticsConfig } from "./analytics-config";
describe("Saved checkout settings", () => {
  it("disables COD when switched off", () => expect(paymentAllowed(1500,"cod",{...DEFAULT_CHECKOUT_RULES,cod_enabled:false})).toBe(false));
  it("enforces COD minimum and maximum", () => { expect(paymentAllowed(499,"cod",{...DEFAULT_CHECKOUT_RULES,cod_min:500})).toBe(false); expect(paymentAllowed(50001,"cod",DEFAULT_CHECKOUT_RULES)).toBe(false); });
  it("disables online payments when switched off", () => expect(paymentAllowed(1500,"razorpay",{...DEFAULT_CHECKOUT_RULES,razorpay_enabled:false})).toBe(false));
  it("uses saved shipping rate and COD fee", () => expect(checkoutTotals(500,"cod",{...DEFAULT_CHECKOUT_RULES,flat_rate:99,cod_fee:25}).total).toBe(649));
  it("uses free shipping threshold", () => expect(checkoutTotals(2001,"razorpay",{...DEFAULT_CHECKOUT_RULES,free_shipping_threshold:2000}).shipping).toBe(0));
});
describe("Analytics identifiers", () => {
  it("retains the store measurement ID by default", () => expect(analyticsConfig(null).ga4_id).toBe("G-HC5QHDQQN0"));
  it("rejects script content in identifiers", () => expect(analyticsConfig({ga4_id:"<script>alert(1)</script>"}).ga4_id).toBe(""));
});