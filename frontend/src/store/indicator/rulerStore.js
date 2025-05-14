import { create } from "zustand";

const useRulerStore = create((set) => ({
  isRulerMode: false,
  toggleRulerMode: () => set((state) => ({ isRulerMode: !state.isRulerMode })),
}));

export default useRulerStore;
