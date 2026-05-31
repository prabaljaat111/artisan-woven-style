import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, ShoppingBag, Search, Menu, X, MessageCircle, LayoutGrid, Play, Tag, Sparkles, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useUI } from "@/store/ui";
import { LotusMark } from "./LotusMark";
import { categories } from "@/data/products";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";

const WHATSAPP_URL = "https://wa.me/919999999999";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar />
      <Header />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
      <FloatingButtons />
      <ChatWidget />
      <ExitIntent />
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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-2 justify-self-start">
          <button className="md:hidden p-1 -ml-1" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6 text-primary" />
          </button>
          <Link to="/shop" aria-label="Search" className="hidden md:inline-flex p-2 hover:text-primary"><Search className="h-5 w-5" /></Link>
        </div>
        <Link to="/" className="justify-self-center text-center shrink-0">
          <img
            src={logoUrl}
            alt="Indian Handicraft Standards"
            className="h-12 md:h-16 w-auto mx-auto shrink-0 object-contain max-w-none"
          />
        </Link>
        <div className="flex items-center gap-1 md:gap-3 justify-self-end">
          <Link to="/wishlist" aria-label="Wishlist" className="hidden md:inline-flex relative p-2 hover:text-primary">
            <Heart className="h-5 w-5" />
            {mounted && wishCount > 0 && <span className="absolute top-0 right-0 text-[10px] bg-accent text-accent-foreground rounded-full h-4 w-4 flex items-center justify-center">{wishCount}</span>}
          </Link>
          <Link to="/shop" aria-label="Search" className="md:hidden p-2 text-primary"><Search className="h-5 w-5" /></Link>
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
              <img src={logoUrl} alt="Indian Handicraft Standards" className="h-14 w-auto" />
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
    { to: "/shop", icon: LayoutGrid, label: "Category" },
    { to: "/shop", icon: Play, label: "Watch & Buy" },
    { to: "/shop", icon: Tag, label: "Sale" },
    { to: "/shop", icon: Sparkles, label: "What's New" },
  ];
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

function ChatWidget() {
  const { isChatOpen, setChatOpen } = useUI();
  const chips = ["Track Order", "Size Guide", "WhatsApp Us", "Return Policy"];
  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className="fixed right-3 bottom-44 md:bottom-24 z-50 w-[300px] bg-cream rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div>
              <div className="font-display text-base">Chikan Concierge</div>
              <div className="text-[11px] opacity-80">Usually replies in minutes</div>
            </div>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-secondary rounded-2xl rounded-tl-sm p-3 text-sm">Hi! Ask us anything about our Chikankari collection 🌸</div>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <a key={c} href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-xs border border-gold text-primary rounded-full px-3 py-1.5 hover:bg-gold/20 transition">{c}</a>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExitIntent() {
  const { exitIntentShown, setExitIntentShown } = useUI();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (exitIntentShown) return;
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) { setOpen(true); setExitIntentShown(true); }
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [exitIntentShown, setExitIntentShown]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-cream max-w-md w-full rounded-2xl p-6 md:p-8 text-center relative border-2 border-gold">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3"><X className="h-4 w-4" /></button>
            <LotusMark className="h-8 w-8 text-gold mx-auto mb-3" />
            <h3 className="font-display text-2xl text-primary">Wait — 10% off your first order</h3>
            <p className="text-sm text-muted-foreground mt-2">Enter your WhatsApp number for an exclusive welcome discount and early access to new collections.</p>
            <form onSubmit={(e) => { e.preventDefault(); setOpen(false); }} className="mt-4 flex gap-2">
              <input type="tel" placeholder="+91 98765 43210" className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background" />
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Get 10% off</button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <img src={logoUrl} alt="Indian Handicraft Standards" className="h-24 w-auto bg-white rounded-md p-2" />
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
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 py-4 text-center text-[11px] opacity-75">© 2025 Indian Handicraft Standards · Crafted with ❤ in Lucknow</div>
    </footer>
  );
}