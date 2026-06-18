import { useEffect, useState } from "react";
import { X } from "lucide-react";
import poster from "@/assets/ad-poster.jpg.asset.json";

const KEY = "ad-poster-dismissed";

export function AdPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch { /* ignore */ }
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setOpen(false);
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Advertisement"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-in fade-in"
      onClick={close}
    >
      <div
        className="relative w-full max-w-[420px] md:max-w-[520px] max-h-[95vh] overflow-hidden rounded-xl shadow-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close advertisement"
          className="absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>
        <a
          href="https://haryanaaffordablecommercialcomplexyojna.com"
          target="_blank"
          rel="noreferrer noopener"
          className="block"
        >
          <img
            src={poster.url}
            alt="Haryana Affordable Commercial Complex Yojna"
            className="w-full h-auto max-h-[95vh] object-contain"
            loading="eager"
          />
        </a>
      </div>
    </div>
  );
}