import { create } from "zustand";

export const useSessionStore = create((set) => ({
  user: null,
}));
