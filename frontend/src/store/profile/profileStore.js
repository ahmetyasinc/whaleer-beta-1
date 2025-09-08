import { create } from "zustand";

export const useProfileStore = create((set) => ({
  apis: [],
  activeApiId: null,

  setActiveApiById: (id) => set({ activeApiId: Number(id) }),
}));
