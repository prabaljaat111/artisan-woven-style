import { describe, expect, it } from "vitest";
import { ga4ValidationPassed, metaEventAccepted } from "./conversion-validation";
describe("Provider conversion acknowledgements", () => {
  it("rejects GA4 payload validation errors even with HTTP success", () => expect(ga4ValidationPassed({ validationMessages: [{ validationCode: "VALUE_INVALID" }] })).toBe(false));
  it("accepts a valid GA4 validation result", () => expect(ga4ValidationPassed({ validationMessages: [] })).toBe(true));
  it("rejects unrecognized GA4 responses", () => expect(ga4ValidationPassed({})).toBe(false));
  it("rejects Meta error responses even with HTTP success", () => expect(metaEventAccepted({ error: { message: "Invalid payload" }, events_received: 1 })).toBe(false));
  it("requires Meta acknowledgement of an event", () => expect(metaEventAccepted({ events_received: 0 })).toBe(false));
  it("accepts Meta acknowledgement", () => expect(metaEventAccepted({ events_received: 1 })).toBe(true));
});