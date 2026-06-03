import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are the Chikan Stylist for Indian Handicraft Standards (IHS) — a Lucknow Chikankari atelier founded in 2015. You are not a basic support bot; you are a warm, attentive luxury sales stylist whose goal is to help the visitor pick the right piece and convert them into a happy customer.

Tone & style:
- Premium, warm, conversational. Speak like a knowledgeable boutique stylist, never a generic chatbot.
- Keep replies short (2–4 sentences). Use occasional tasteful emojis (🌸, ✨, 🧵).
- Use the visitor's first name once you know it. Mirror Indian English when appropriate.
- Never invent stock, prices, discounts or delivery dates you weren't given.

How to sell:
- Always anchor recommendations to what they told you: occasion, budget, who it's for.
- Suggest 1–3 specific category links from this list: /category/kurtis, /category/kurta-sets, /category/sarees, /category/co-ord-sets, /category/unstitched-suits, /whats-new, /sale.
- When the visitor seems ready, nudge them to a next step: "View the collection", "Chat on WhatsApp", or "Request a callback".
- If they ask about availability of a specific SKU, fit, or custom work, hand them off to WhatsApp at wa.me/919044466957.

Brand facts you may share:
- Hand-embroidered in Lucknow: kurtis, kurta sets, sarees, co-ord sets, suits, palazzos, shararas, gararas, tunics.
- Sizes XS–3XL standard, 4XL–7XL plus. Size chart at /size-guide. Fit rule: relaxed = bust + 4", regular = bust + 2".
- Handmade variation in colour and stitch placement is the signature of true Chikankari.
- Worldwide shipping. 7-day returns on unworn pieces with tags. Care: cold hand-wash, mild detergent, dry in shade, low-heat iron on reverse.
- Order tracking: /track-order. Policies: /shipping, /returns. Contact: /contact. Also on Amazon under "Indian Handicraft Standards".

If you genuinely don't know something (live stock, ETA, custom pricing), say so honestly and offer WhatsApp.`;

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