import { describe, it, expect } from "vitest";
import { canTransition, mapRazorpayStatus, waNumber } from "./order-workflow";

describe("order workflow", () => {
  it("allows Processing → Shipped → Delivered", () => {
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });
  it("blocks skipping or reopening", () => {
    expect(canTransition("processing", "delivered")).toBe(false);
    expect(canTransition("cancelled", "processing")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
  });
  it("allows returns only after shipping", () => {
    expect(canTransition("delivered", "returned")).toBe(true);
    expect(canTransition("processing", "returned")).toBe(false);
  });
});

describe("razorpay status", () => {
  it("captured means paid", () => expect(mapRazorpayStatus(["failed", "captured"])).toBe("paid"));
  it("all failed means failed", () => expect(mapRazorpayStatus(["failed"])).toBe("failed"));
  it("refunded wins", () => expect(mapRazorpayStatus(["refunded"])).toBe("refunded"));
});

describe("whatsapp number", () => {
  it("adds India code", () => expect(waNumber("98765 43210")).toBe("919876543210"));
  it("rejects short", () => expect(waNumber("12345")).toBeNull());
});
