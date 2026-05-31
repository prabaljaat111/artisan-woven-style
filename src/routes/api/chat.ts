import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are the Chikan Concierge for Indian Handicraft Standards (IHS), a Lucknow-based Chikankari brand founded in 2015 with 10,000+ happy customers.

Help shoppers warmly and concisely (2-4 sentences unless they ask for detail). Use simple language with occasional emojis 🌸.

Key facts you can share:
- Crafts: hand-embroidered Chikankari kurtis, kurta sets, palazzos, shararas, gararas, sarees, unstitched suits, short tops, noodle-strap tops, tunics, pants.
- Sizes: XS-3XL standard, 4XL-7XL plus size. Point users to /size-guide for full charts. Fit rule: relaxed = bust + 4 inches, regular = bust + 2 inches.
- Handmade variation in color and embroidery placement is the signature of true Chikankari.
- Made in Lucknow. Worldwide shipping. 7-day returns on unworn items with tags.
- Care: gentle hand-wash in cold water, mild detergent, dry in shade, low-heat iron on reverse.
- Also available on Amazon (search "Indian Handicraft Standards") and via WhatsApp at +91 99999 99999.
- For order tracking direct them to /track-order. For policies /shipping, /returns. For sizing /size-guide. For contact /contact.
- If asked for a human, share WhatsApp link wa.me/919999999999.

If you don't know an answer (e.g. exact stock of a specific SKU), say so and suggest WhatsApp.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
          };

          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY missing" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const trimmed = messages.slice(-20).map((m) => ({
            role: m.role,
            content: String(m.content ?? "").slice(0, 2000),
          }));

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                stream: true,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  ...trimmed,
                ],
              }),
            },
          );

          if (!upstream.ok) {
            if (upstream.status === 429) {
              return new Response(
                JSON.stringify({ error: "Too many requests, please try again in a moment." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (upstream.status === 402) {
              return new Response(
                JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const text = await upstream.text();
            console.error("AI gateway error", upstream.status, text);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("chat route error", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});