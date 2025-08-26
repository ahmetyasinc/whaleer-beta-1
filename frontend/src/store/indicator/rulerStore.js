import { create } from "zustand";

const useRulerStore = create((set) => ({
  isRulerMode: false,
  toggleRulerMode: () =>
  set((state) => {
    const next = !state.isRulerMode;
    console.log("[RULER] toggleRulerMode ->", next);
    return { isRulerMode: next };
  }),

}));

export default useRulerStore;
