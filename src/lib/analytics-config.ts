export const ANALYTICS_DEFAULTS = { ga4_id: "G-HC5QHDQQN0", gtm_id: "GTM-NGJKBBQK", meta_pixel_id: "", gsc_verification: "" };
export type AnalyticsConfig = typeof ANALYTICS_DEFAULTS;
export function analyticsConfig(value: unknown): AnalyticsConfig {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const valid = (key: keyof AnalyticsConfig, pattern: RegExp) => {
    const raw = typeof v[key] === "string" ? v[key].trim() : ANALYTICS_DEFAULTS[key];
    return pattern.test(raw) ? raw : "";
  };
  return { ga4_id: valid("ga4_id", /^G-[A-Z0-9]+$/), gtm_id: valid("gtm_id", /^GTM-[A-Z0-9]+$/), meta_pixel_id: valid("meta_pixel_id", /^\d{5,20}$/), gsc_verification: valid("gsc_verification", /^[a-zA-Z0-9_-]{1,120}$/) };
}