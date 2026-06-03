import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Phone, ShoppingBag, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useUI } from "@/store/ui";
import { WHATSAPP_URL } from "@/lib/contact";
import { supabase } from "@/integrations/supabase/client";
import { updateLeadConversation } from "@/lib/leads.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

type Stage = "greet" | "qualify" | "capture" | "assist";

interface QualifyAnswers {
  interest?: string;
  category?: string;
  forSelf?: boolean;
  occasion?: string;
  budget?: string;
}

const INTEREST_OPTIONS = [
  { label: "Chikankari Kurti", category: "kurtis" },
  { label: "Kurta Set", category: "kurta-sets" },
  { label: "Saree", category: "sarees" },
  { label: "Co-ord Set", category: "co-ord-sets" },
  { label: "New Arrivals", category: "whats-new" },
  { label: "Best Sellers", category: "shop" },
  { label: "Custom / Bespoke", category: undefined },
];

const OCCASIONS = ["Daily wear", "Festive", "Wedding", "Party", "Casual"];
const BUDGETS = ["Under ₹2,000", "₹2,000 – ₹5,000", "₹5,000 – ₹10,000", "₹10,000+", "Flexible"];

const GREETING: Msg = {
  role: "assistant",
  content:
    "🌸 Welcome to Indian Handicraft Standards. I'm your personal Chikankari stylist. What are you looking for today?",
};

function categoryHref(cat?: string): string {
  if (!cat) return "/contact";
  if (cat === "whats-new") return "/whats-new";
  if (cat === "shop") return "/shop";
  return `/category/${cat}`;
}

export function ChatWidget() {
  const { isChatOpen, setChatOpen } = useUI();
  const [stage, setStage] = useState<Stage>("greet");
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [answers, setAnswers] = useState<QualifyAnswers>({});
  const [qualifyStep, setQualifyStep] = useState<"forWhom" | "occasion" | "budget" | "done">("forWhom");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp: "", phone: "" });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, stage, qualifyStep]);

  // Append a message helper
  const push = (m: Msg) => setMessages((prev) => [...prev, m]);
  const pushUser = (text: string) => push({ role: "user", content: text });
  const pushAssistant = (text: string) => push({ role: "assistant", content: text });

  // ---- Stage 1: pick interest -----------------------------------------
  function pickInterest(opt: (typeof INTEREST_OPTIONS)[number]) {
    pushUser(opt.label);
    setAnswers((a) => ({ ...a, interest: opt.label, category: opt.category }));
    setStage("qualify");
    setQualifyStep("forWhom");
    setTimeout(() => {
      pushAssistant(
        opt.category
          ? `Lovely choice. ✨ A few quick questions so I can curate the perfect ${opt.label.toLowerCase()} for you — is this for yourself or a gift?`
          : "Beautiful — we love a bespoke brief. ✨ First, is this for yourself or a gift?",
      );
    }, 250);
  }

  // ---- Stage 2: qualify -----------------------------------------------
  function answerForWhom(forSelf: boolean) {
    pushUser(forSelf ? "For myself" : "A gift");
    setAnswers((a) => ({ ...a, forSelf }));
    setQualifyStep("occasion");
    setTimeout(() => pushAssistant("Wonderful. What's the occasion?"), 200);
  }
  function answerOccasion(occasion: string) {
    pushUser(occasion);
    setAnswers((a) => ({ ...a, occasion }));
    setQualifyStep("budget");
    setTimeout(() => pushAssistant("Noted. And what budget range feels right?"), 200);
  }
  function answerBudget(budget: string) {
    pushUser(budget);
    setAnswers((a) => ({ ...a, budget }));
    setQualifyStep("done");
    setStage("capture");
    setTimeout(
      () =>
        pushAssistant(
          "Perfect. To share our latest curation, lookbook and reserve pieces in your size — may I have your name and WhatsApp number? It takes 10 seconds. 🌿",
        ),
      250,
    );
  }

  // ---- Stage 3: lead capture ------------------------------------------
  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const whatsapp = form.whatsapp.trim();
    if (name.length < 2) {
      toast.error("Please enter your name");
      return;
    }
    const phoneDigits = whatsapp.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      toast.error("Please enter a valid WhatsApp number");
      return;
    }
    setSubmitting(true);
    const conversationSnapshot = [...messages, { role: "user" as Role, content: `Name: ${name} · WhatsApp: ${whatsapp}` }];
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name,
          phone: form.phone.trim() || whatsapp,
          whatsapp,
          interest: answers.interest ?? null,
          category: answers.category ?? null,
          occasion: answers.occasion ?? null,
          budget: answers.budget ?? null,
          for_self: answers.forSelf ?? null,
          page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
          source: "chat",
          status: "qualified",
          conversation: conversationSnapshot,
        })
        .select("id")
        .single();
      if (error) throw error;
      setLeadId(data.id);
      pushUser(`Name: ${name} · WhatsApp: ${whatsapp}`);
      setStage("assist");
      setTimeout(() => {
        pushAssistant(
          `Thank you, ${name.split(" ")[0]}! 🌸 Our team will reach out on WhatsApp shortly. In the meantime, ask me anything — fabrics, sizing, styling tips, or share a picture you love and I'll find similar pieces.`,
        );
      }, 200);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't submit right now. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  }

  function skipCapture() {
    pushUser("I'll share later");
    setStage("assist");
    setTimeout(
      () =>
        pushAssistant(
          "No problem at all. 🌿 Ask me anything about our Chikankari pieces — sizes, fabrics, styling, or care.",
        ),
      200,
    );
  }

  // ---- Stage 4: AI assist ---------------------------------------------
  async function sendToAI(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    const next: Msg[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    // Inject qualifying context as a hidden system-style preamble for the AI
    const contextSummary =
      `Visitor context — interest: ${answers.interest ?? "n/a"}; for: ${
        answers.forSelf === undefined ? "n/a" : answers.forSelf ? "self" : "gift"
      }; occasion: ${answers.occasion ?? "n/a"}; budget: ${answers.budget ?? "n/a"}; name: ${
        form.name || "unknown"
      }.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: contextSummary }, ...next],
        }),
      });
      if (!resp.ok || !resp.body) {
        let errMsg = "Something went wrong. Please try WhatsApp.";
        try {
          const j = await resp.json();
          if (j?.error) errMsg = j.error;
        } catch {}
        push({ role: "assistant", content: errMsg });
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      push({ role: "assistant", content: "" });

      const flush = (chunk: string) => {
        assistantText += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      };

      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) flush(c);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Persist updated transcript to the lead (fire-and-forget)
      if (leadId) {
        const final: Msg[] = [...next, { role: "assistant", content: assistantText }];
        updateLeadConversation({ data: { leadId, conversation: final } }).catch(() => {});
      }
    } catch (e) {
      console.error("chat error", e);
      push({ role: "assistant", content: "Connection lost. Please try WhatsApp." });
    } finally {
      setIsLoading(false);
    }
  }

  async function requestCallback() {
    pushUser("Please request a callback for me");
    pushAssistant("Done. ✨ Our stylist will call you shortly. If you'd like to chat now, WhatsApp is the fastest.");
    if (leadId) {
      try {
        await updateLeadConversation({
          data: {
            leadId,
            conversation: [...messages, { role: "user", content: "Callback requested" }],
            status: "callback_requested",
          },
        });
      } catch {}
    }
  }

  async function askStylist() {
    pushUser("I'd like a stylist's recommendation");
    pushAssistant(
      "Of course. Tell me a little more — any colour or fabric preference, and the date you'd wear it? I'll shortlist 3 pieces for you.",
    );
    if (leadId) {
      try {
        await updateLeadConversation({
          data: { leadId, conversation: [...messages], status: "stylist_requested" },
        });
      } catch {}
    }
  }

  // ---- Render ----------------------------------------------------------
  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="fixed right-3 bottom-44 md:bottom-24 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] bg-cream rounded-2xl shadow-2xl border border-gold/40 overflow-hidden flex flex-col"
          style={{ maxHeight: "min(78vh, 620px)" }}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gold/25 border border-gold/50 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-gold" />
              </div>
              <div>
                <div className="font-display text-base leading-tight">Chikan Stylist</div>
                <div className="text-[11px] opacity-80 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                  Online · Replies instantly
                </div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat" className="p-1 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed max-w-[88%] shadow-sm",
                  m.role === "assistant"
                    ? "bg-background text-foreground rounded-tl-sm border border-border"
                    : "bg-primary text-primary-foreground rounded-tr-sm ml-auto",
                )}
              >
                {m.content ||
                  (isLoading && i === messages.length - 1 ? (
                    <span className="opacity-60 inline-flex gap-1">
                      <Dot delay={0} /> <Dot delay={0.15} /> <Dot delay={0.3} />
                    </span>
                  ) : (
                    ""
                  ))}
              </div>
            ))}

            {/* Stage-specific chips */}
            {stage === "greet" && (
              <ChipRow>
                {INTEREST_OPTIONS.map((opt) => (
                  <Chip key={opt.label} onClick={() => pickInterest(opt)}>
                    {opt.label}
                  </Chip>
                ))}
              </ChipRow>
            )}
            {stage === "qualify" && qualifyStep === "forWhom" && (
              <ChipRow>
                <Chip onClick={() => answerForWhom(true)}>For myself</Chip>
                <Chip onClick={() => answerForWhom(false)}>A gift</Chip>
              </ChipRow>
            )}
            {stage === "qualify" && qualifyStep === "occasion" && (
              <ChipRow>
                {OCCASIONS.map((o) => (
                  <Chip key={o} onClick={() => answerOccasion(o)}>
                    {o}
                  </Chip>
                ))}
              </ChipRow>
            )}
            {stage === "qualify" && qualifyStep === "budget" && (
              <ChipRow>
                {BUDGETS.map((b) => (
                  <Chip key={b} onClick={() => answerBudget(b)}>
                    {b}
                  </Chip>
                ))}
              </ChipRow>
            )}

            {/* Capture form */}
            {stage === "capture" && (
              <form
                onSubmit={submitLead}
                className="rounded-xl border border-gold/40 bg-background p-3 space-y-2"
              >
                <input
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-cream focus:outline-none focus:ring-1 focus:ring-gold"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={80}
                  autoComplete="name"
                />
                <input
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-cream focus:outline-none focus:ring-1 focus:ring-gold"
                  placeholder="WhatsApp number (e.g. +91 98765 43210)"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  maxLength={24}
                  inputMode="tel"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? "Sending…" : (<><CheckCircle2 className="h-4 w-4" /> Get my curated picks</>)}
                </button>
                <button
                  type="button"
                  onClick={skipCapture}
                  className="w-full text-[11px] text-muted-foreground hover:text-primary"
                >
                  Skip for now
                </button>
              </form>
            )}

            {/* Post-capture action buttons */}
            {stage === "assist" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={categoryHref(answers.category)}
                  onClick={() => setChatOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-full px-3 py-2 hover:bg-primary/90"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> View products
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-[#25D366] text-white rounded-full px-3 py-2 hover:opacity-90"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <button
                  onClick={requestCallback}
                  className="flex items-center justify-center gap-1.5 text-[11px] border border-gold text-primary rounded-full px-3 py-2 hover:bg-gold/15"
                >
                  <Phone className="h-3.5 w-3.5" /> Request callback
                </button>
                <button
                  onClick={askStylist}
                  className="flex items-center justify-center gap-1.5 text-[11px] border border-gold text-primary rounded-full px-3 py-2 hover:bg-gold/15"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ask a stylist
                </button>
              </div>
            )}
          </div>

          {/* Input bar (only in assist stage) */}
          {stage === "assist" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendToAI(input);
              }}
              className="border-t border-border p-2 flex gap-2 bg-background"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about fit, fabric, styling…"
                className="flex-1 bg-transparent text-sm px-3 py-2 outline-none"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-md disabled:opacity-50 flex items-center gap-1"
              >
                Send <ArrowRight className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <div className="border-t border-border bg-background px-3 py-2 text-[10px] text-center text-muted-foreground">
              Tap an option above — or {" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-primary underline">
                chat on WhatsApp
              </a>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 pt-1">{children}</div>;
}
function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs border border-gold/60 bg-background text-primary rounded-full px-3 py-1.5 hover:bg-gold/15 transition shadow-sm"
    >
      {children}
    </button>
  );
}
function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-primary/60 inline-block"
      animate={{ y: [0, -2, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
    />
  );
}