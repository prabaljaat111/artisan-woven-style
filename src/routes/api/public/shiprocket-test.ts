import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shiprocket-test")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getShiprocketToken } = await import("@/lib/shiprocket.server");
          // force refresh to bypass any cached token
          const token = await getShiprocketToken(true);
          return new Response(
            JSON.stringify({ ok: true, token_preview: token.slice(0, 16) + "..." }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});