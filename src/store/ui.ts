import { create } from "zustand";

interface UIState {
  isChatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  exitIntentShown: boolean;
  setExitIntentShown: (v: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  /** Number of product detail pages this visitor has opened in the session. */
  productViewCount: number;
  incrementProductView: () => void;
  /** True once we've already auto-nudged the user (so we don't spam). */
  proactiveNudgeShown: boolean;
  setProactiveNudgeShown: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  isChatOpen: false,
  setChatOpen: (v) => set({ isChatOpen: v }),
  isMobileNavOpen: false,
  setMobileNavOpen: (v) => set({ isMobileNavOpen: v }),
  exitIntentShown: false,
  setExitIntentShown: (v) => set({ exitIntentShown: v }),
  isSearchOpen: false,
  setSearchOpen: (v) => set({ isSearchOpen: v }),
  productViewCount: 0,
  incrementProductView: () => set((s) => ({ productViewCount: s.productViewCount + 1 })),
  proactiveNudgeShown: false,
  setProactiveNudgeShown: (v) => set({ proactiveNudgeShown: v }),
}));