import { describe, expect, it } from "vitest";
import { isCapturedPayment } from "./payment-validation";

const payment = { order_id: "order_ihs", amount: 60300, currency: "INR", status: "captured", captured: true };
describe("Captured checkout payments", () => {
  it("accepts the captured payment for the exact order and amount", () => expect(isCapturedPayment(payment, "order_ihs", 60300)).toBe(true));
  it("rejects authorized but uncaptured payments", () => expect(isCapturedPayment({ ...payment, status: "authorized", captured: false }, "order_ihs", 60300)).toBe(false));
  it("rejects a different order", () => expect(isCapturedPayment(payment, "order_other", 60300)).toBe(false));
  it("rejects mismatched amounts", () => expect(isCapturedPayment(payment, "order_ihs", 60400)).toBe(false));
  it("rejects a different currency", () => expect(isCapturedPayment({ ...payment, currency: "USD" }, "order_ihs", 60300)).toBe(false));
});