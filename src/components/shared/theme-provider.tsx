"use client";

import { useEffect, type ReactNode } from "react";
import { useAccessibilityStore } from "@/stores/accessibility-store";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { dyslexiaFont, highContrast } = useAccessibilityStore();

  useEffect(() => {
    document.body.classList.toggle("dyslexia-font", dyslexiaFont);
  }, [dyslexiaFont]);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  return <>{children}</>;
}
