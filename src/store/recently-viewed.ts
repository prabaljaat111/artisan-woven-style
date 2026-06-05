import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  ids: string[];
  add: (id: string) => void;
  clear: () => void;
}

const MAX = 12;

export const useRecentlyViewed = create<State>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, MAX) })),
      clear: () => set({ ids: [] }),
    }),
    { name: "ihs-recently-viewed" },
  ),
);