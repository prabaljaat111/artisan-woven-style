import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Heart, Home, ShoppingBag, Search, Menu, X, MessageCircle, LayoutGrid, Play, Tag, Sparkles, ChevronRight, Instagram, Facebook, Youtube } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useUI } from "@/store/ui";
import { BrandLogo, FullBrandLogo } from "./BrandLogo";
import { LotusMark } from "./LotusMark";
import { categories } from "@/data/products";
import { useStorefrontProducts } from "@/hooks/use-storefront-products";
import { cn } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ChatWidget = lazy(() =>
  import("./ChatWidget").then((m) => ({ default: m.ChatWidget }))
);

function DeferredChatWidget() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const trigger = () => setShow(true);
    if (w.requestIdleCallback) w.requestIdleCallback(trigger);
    else setTimeout(trigger, 1500);
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNav />
      <FloatingButtons />
      <DeferredChatWidget />
      <SearchOverlay />
      <ExitIntent />
      <ProactiveNudge />
    </div>
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground text-[11px] md:text-xs text-center py-2.5 px-3">
      <span className="font-medium tracking-[0.25em] uppercase">Worldwide Shipping</span>
    </div>
  );
}

function Header() {
  const totalCount = useCart((s) => s.totalCount());
  const wishCount = useWishlist((s) => s.ids.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-2 justify-self-start">
          <button className="md:hidden p-1 -ml-1" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6 text-primary" />
          </button>
          <SearchTriggerDesktop />
        </div>
        <Link to="/" className="justify-self-center text-center shrink-0">
          <BrandLogo size="lg" />
        </Link>
        <div className="flex items-center gap-1 md:gap-3 justify-self-end">
          <Link to="/wishlist" aria-label="Wishlist" className="hidden md:inline-flex relative p-2 hover:text-primary">
            <Heart className="h-5 w-5" />
            {mounted && wishCount > 0 && <span className="absolute top-0 right-0 text-[10px] bg-accent text-accent-foreground rounded-full h-4 w-4 flex items-center justify-center">{wishCount}</span>}
          </Link>
          <SearchTriggerMobile />
          <Link to="/cart" aria-label="Cart" className="relative p-2 text-primary hover:text-primary/80">
            <ShoppingBag className="h-5 w-5" />
            {mounted && totalCount > 0 && <span className="absolute top-0 right-0 text-[10px] bg-accent text-accent-foreground rounded-full h-4 w-4 flex items-center justify-center">{totalCount}</span>}
          </Link>
        </div>
      </div>
      <nav className="hidden md:flex items-center justify-center gap-8 text-sm pb-3 border-t border-border/60 pt-3">
        <Link to="/" className="hover:text-primary transition">Home</Link>
        <Link to="/shop" className="hover:text-primary transition">Shop</Link>
        <Link to="/about" className="hover:text-primary transition">About us</Link>
        <Link to="/track-order" className="hover:text-primary transition">Track Order</Link>
        <Link to="/faq" className="hover:text-primary transition">FAQs</Link>
        <Link to="/contact" className="hover:text-primary transition">Get in Touch</Link>
      </nav>
    </header>
    <AnimatePresence>
        {menuOpen && (
          <>
          <div className="fixed inset-0 bg-foreground/50 z-[60] md:hidden" onClick={() => setMenuOpen(false)} />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            style={{ backgroundColor: "#FFFFFF" }}
            className="fixed inset-y-0 left-0 w-[88%] max-w-sm z-[70] shadow-2xl md:hidden isolate flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border" style={{ backgroundColor: "#FFFFFF" }}>
              <BrandLogo size="md" />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary transition"
              >
                <X className="h-5 w-5 text-primary" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#FFFFFF" }}>
              {/* Primary nav */}
              <div className="px-3 py-3">
                {[
                  { to: "/", label: "Home", icon: Home },
                  { to: "/shop", label: "Shop All", icon: LayoutGrid },
                  { to: "/about", label: "About Us", icon: Sparkles },
                  { to: "/track-order", label: "Track Order", icon: Search },
                  { to: "/contact", label: "Contact", icon: MessageCircle },
                  { to: "/faq", label: "FAQ", icon: Tag },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg font-display text-[15px] text-primary hover:bg-secondary transition"
                    >
                      <Icon className="h-4 w-4 text-gold" />
                      <span>{l.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="mx-5 my-2 grid grid-cols-2 gap-2">
                <Link
                  to="/wishlist"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg border border-border text-sm text-primary hover:bg-secondary transition"
                >
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                >
                  <ShoppingBag className="h-4 w-4" /> Cart
                </Link>
              </div>

              {/* Categories */}
              <div className="px-5 pt-5 pb-2">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Shop by Category
                </div>
              </div>
              <div className="px-3 pb-4">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition"
                  >
                    <span>{c.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>

              {/* Contact footer */}
              <div className="mt-2 px-5 py-5 border-t border-border bg-secondary/40">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Need help?</div>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary font-medium"
                >
                  <MessageCircle className="h-4 w-4 text-gold" />
                  Chat with us on WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/category", icon: LayoutGrid, label: "Category" },
    { to: "/watch-and-buy", icon: Play, label: "Watch & Buy" },
    { to: "/sale", icon: Tag, label: "Sale" },
    { to: "/whats-new", icon: Sparkles, label: "What's New" },
  ] as const;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/98 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5">
        {items.map((i) => {
          const active = pathname === i.to;
          const Icon = i.icon;
          return (
            <Link key={i.label} to={i.to} className={cn("flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px]", active ? "text-primary" : "text-foreground/70")}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FloatingButtons() {
  const setChatOpen = useUI((s) => s.setChatOpen);
  return (
    <div className="fixed right-3 bottom-24 md:bottom-6 z-40 flex flex-col gap-3">
      <button onClick={() => setChatOpen(true)} aria-label="Open chat" className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition">
        <MessageCircle className="h-5 w-5" />
      </button>
      <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="h-12 w-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-105 transition">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.554-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" /></svg>
      </a>
    </div>
  );
}

function ProactiveNudge() {
  const { isChatOpen, setChatOpen, proactiveNudgeShown, setProactiveNudgeShown, productViewCount } = useUI();
  const [nudge, setNudge] = useState<string | null>(null);

  // 30-second timer + multi-product visit trigger
  useEffect(() => {
    if (proactiveNudgeShown || isChatOpen) return;
    if (productViewCount >= 3) {
      setNudge("Loving anything in particular? I can help you pick the right one. 🌸");
      setProactiveNudgeShown(true);
      return;
    }
    const t = setTimeout(() => {
      if (!isChatOpen) {
        setNudge("👋 Looking for a Kurti, Kurta Set or Saree? I can curate it in 30 seconds.");
        setProactiveNudgeShown(true);
      }
    }, 30000);
    return () => clearTimeout(t);
  }, [isChatOpen, proactiveNudgeShown, productViewCount, setProactiveNudgeShown]);

  // Auto-dismiss after 12s
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(null), 12000);
    return () => clearTimeout(t);
  }, [nudge]);

  return (
    <AnimatePresence>
      {nudge && !isChatOpen && (
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          onClick={() => {
            setNudge(null);
            setChatOpen(true);
          }}
          className="fixed right-16 bottom-24 md:bottom-7 z-40 max-w-[260px] text-left bg-background border border-gold/60 shadow-xl rounded-2xl rounded-br-sm px-3.5 py-2.5 text-xs text-foreground hover:bg-cream transition"
        >
          <span className="block font-display text-primary text-[13px] leading-snug">{nudge}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5">Tap to chat</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function ExitIntent() {
  const { exitIntentShown, setExitIntentShown } = useUI();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (exitIntentShown) return;
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) { setOpen(true); setExitIntentShown(true); }
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [exitIntentShown, setExitIntentShown]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return toast.error("Please enter a valid number");
    setSending(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: "Exit-intent visitor",
        phone: phone.trim(),
        whatsapp: phone.trim(),
        interest: "Welcome discount 10%",
        page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
        source: "exit_intent",
        status: "new",
        notes: "Requested 10% welcome discount via exit-intent popup",
        conversation: [],
      });
      if (error) throw error;
      setSent(true);
      toast.success("Code WELCOME10 will be sent on WhatsApp shortly");
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save. Please try WhatsApp directly.");
    } finally {
      setSending(false);
    }
  }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-cream max-w-md w-full rounded-2xl p-6 md:p-8 text-center relative border-2 border-gold">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3"><X className="h-4 w-4" /></button>
            <LotusMark className="h-8 w-8 text-gold mx-auto mb-3" />
            <h3 className="font-display text-2xl text-primary">Wait — 10% off your first order</h3>
            <p className="text-sm text-muted-foreground mt-2">Enter your WhatsApp number for an exclusive welcome discount and early access to new collections.</p>
            <form onSubmit={submit} className="mt-4 flex gap-2">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={24}
                placeholder="+91 98765 43210"
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
              <button disabled={sending || sent} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60">
                {sent ? "✓ Sent" : sending ? "Sending…" : "Get 10% off"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground pb-36 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="bg-primary-foreground/5 rounded-md p-3 inline-block">
            <FullBrandLogo className="h-40 w-auto" />
          </div>
          <p className="text-xs mt-3 opacity-80 leading-relaxed">Authenticity Woven in Every Thread. Championing genuine Lucknowi Chikankari since 2015.</p>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3 text-gold">Quick Links</h4>
          <ul className="space-y-2 text-xs opacity-90">
            <li><Link to="/shop">Shop All</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/track-order">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3 text-gold">Categories</h4>
          <ul className="space-y-2 text-xs opacity-90">
            {categories.slice(0, 5).map((c) => (
              <li key={c.slug}><Link to="/category/$slug" params={{ slug: c.slug }}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3 text-gold">Policies</h4>
          <ul className="space-y-2 text-xs opacity-90">
            <li><Link to="/shipping">Shipping Policy</Link></li>
            <li><Link to="/returns">Returns & Exchange</Link></li>
            <li><Link to="/size-guide">Size Guide</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
            {/* Social */}
            <div className="flex flex-col items-center md:items-start gap-5">
              <div className="flex flex-col items-center md:items-start gap-2.5">
                <span className="font-display text-sm md:text-[15px] font-semibold uppercase tracking-[0.25em] text-gold">
                  Follow Us
                </span>
                <div className="gold-underline w-10" />
              </div>
              <div className="flex items-center gap-5 md:gap-6">
                <a
                  href="https://www.instagram.com/indian_handicraft_standards"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="group relative flex items-center justify-center h-[52px] w-[52px] rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] text-primary-foreground/75 backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.12] hover:border-gold/50 hover:bg-gold/10 hover:text-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.2)] active:scale-95"
                >
                  <Instagram className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                </a>
                <a
                  href="https://www.facebook.com/share/18gmkPS1C4/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="group relative flex items-center justify-center h-[52px] w-[52px] rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] text-primary-foreground/75 backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.12] hover:border-gold/50 hover:bg-gold/10 hover:text-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.2)] active:scale-95"
                >
                  <Facebook className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                </a>
                <a
                  href="http://www.youtube.com/@indianhandicraftstandards8147"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="group relative flex items-center justify-center h-[52px] w-[52px] rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] text-primary-foreground/75 backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.12] hover:border-gold/50 hover:bg-gold/10 hover:text-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.2)] active:scale-95"
                >
                  <Youtube className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                </a>
              </div>
            </div>

            {/* Amazon */}
            <div className="flex flex-col items-center gap-4">
              <h4 className="font-display text-sm text-gold tracking-wider">Available on Amazon</h4>
              <a
                href="https://www.amazon.in/s?k=Indian+Handicraft+Standards"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Shop Indian Handicraft Standards on Amazon (opens in a new tab)"
                className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-gold text-primary font-display text-sm font-semibold tracking-[0.2em] uppercase border border-gold shadow-[0_0_24px_rgba(201,168,76,0.25)] hover:shadow-[0_0_36px_rgba(201,168,76,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M14.41 14.18c-2.36 1.74-5.78 2.67-8.73 2.67-4.13 0-7.86-1.53-10.68-4.07-.22-.2-.02-.47.25-.32 3.04 1.77 6.8 2.83 10.68 2.83 2.62 0 5.5-.54 8.15-1.67.4-.17.74.26.33.56zM15.39 13.05c-.3-.39-2.01-.18-2.78-.09-.23.03-.27-.17-.06-.32 1.36-.96 3.6-.68 3.86-.36.26.33-.07 2.57-1.35 3.64-.2.16-.39.07-.3-.14.29-.73.94-2.34.63-2.73z"/></svg>
                Shop on Amazon
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 py-4 text-center text-[11px] opacity-75">© 2025 Indian Handicraft Standards · Crafted with ❤ in Lucknow</div>
    </footer>
  );
}

function SearchTriggerDesktop() {
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  return (
    <button onClick={() => setSearchOpen(true)} aria-label="Search" className="hidden md:inline-flex p-2 hover:text-primary">
      <Search className="h-5 w-5" />
    </button>
  );
}

function SearchTriggerMobile() {
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  return (
    <button onClick={() => setSearchOpen(true)} aria-label="Search" className="md:hidden p-2 text-primary">
      <Search className="h-5 w-5" />
    </button>
  );
}

function SearchOverlay() {
  const { isSearchOpen, setSearchOpen } = useUI();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const products = useStorefrontProducts();

  useEffect(() => {
    if (!isSearchOpen) return;
    setQ("");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [isSearchOpen, setSearchOpen]);

  const needle = q.trim().toLowerCase();
  const results = needle
    ? products
        .filter((p) => {
          const hay = `${p.name} ${p.category} ${p.colors.join(" ")} ${p.description}`.toLowerCase();
          return hay.includes(needle);
        })
        .slice(0, 6)
    : [];

  const goAll = () => {
    setSearchOpen(false);
    navigate({ to: "/shop", search: { q: needle } as never });
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/50 z-[80]" onClick={() => setSearchOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-0 inset-x-0 z-[81] bg-cream shadow-xl border-b border-border">
            <div className="max-w-3xl mx-auto px-4 py-4">
              <form onSubmit={(e) => { e.preventDefault(); if (needle) goAll(); }} className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search kurtis, sarees, sharara…" className="flex-1 bg-transparent text-base outline-none py-2" />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close" className="p-1.5"><X className="h-5 w-5" /></button>
              </form>
              {needle && (
                <div className="mt-3 border-t border-border pt-3">
                  {results.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No matches. Try a different keyword.</p>
                  ) : (
                    <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                      {results.map((p) => (
                        <li key={p.id}>
                          <Link to="/product/$slug" params={{ slug: p.slug }} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition">
                            <img src={p.images[0]} alt={p.name} loading="lazy" decoding="async" className="h-12 w-12 object-cover rounded-md" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground">₹{p.price.toLocaleString("en-IN")}</div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={goAll} className="mt-2 w-full text-xs uppercase tracking-[0.2em] text-gold py-2 hover:text-primary transition">View all results →</button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}