export function ga4ValidationPassed(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const messages = (body as { validationMessages?: unknown }).validationMessages;
  return Array.isArray(messages) && messages.length === 0;
}

export function metaEventAccepted(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const result = body as { error?: unknown; events_received?: unknown };
  return !result.error && typeof result.events_received === "number" && result.events_received >= 1;
}