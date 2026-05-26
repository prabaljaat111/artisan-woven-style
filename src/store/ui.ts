import { create } from "zustand";

interface UIState {
  isChatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  exitIntentShown: boolean;
  setExitIntentShown: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  isChatOpen: false,
  setChatOpen: (v) => set({ isChatOpen: v }),
  isMobileNavOpen: false,
  setMobileNavOpen: (v) => set({ isMobileNavOpen: v }),
  exitIntentShown: false,
  setExitIntentShown: (v) => set({ exitIntentShown: v }),
}));