import { create } from "zustand";

const useMagnetStore = create((set) => ({
  isMagnetMode: false,
  toggleMagnetMode: () => set((state) => ({ isMagnetMode: !state.isMagnetMode })),
}));

export default useMagnetStore;
