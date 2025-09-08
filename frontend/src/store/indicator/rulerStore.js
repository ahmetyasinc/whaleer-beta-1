import { create } from "zustand";

const useRulerStore = create((set) => ({
  isRulerMode: false,
  toggleRulerMode: () =>
  set((state) => {
    const next = !state.isRulerMode;
    return { isRulerMode: next };
  }),

}));

export default useRulerStore;
