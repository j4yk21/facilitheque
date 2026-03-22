import { create } from "zustand";

interface AccessibilityState {
  dyslexiaFont: boolean;
  highContrast: boolean;
  toggleDyslexiaFont: () => void;
  toggleHighContrast: () => void;
  setDyslexiaFont: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  dyslexiaFont: false,
  highContrast: false,
  toggleDyslexiaFont: () =>
    set((state) => ({ dyslexiaFont: !state.dyslexiaFont })),
  toggleHighContrast: () =>
    set((state) => ({ highContrast: !state.highContrast })),
  setDyslexiaFont: (enabled) => set({ dyslexiaFont: enabled }),
  setHighContrast: (enabled) => set({ highContrast: enabled }),
}));
