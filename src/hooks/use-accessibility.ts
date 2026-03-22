"use client";

import { useCallback } from "react";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSupabase } from "./use-supabase";

export function useAccessibility() {
  const supabase = useSupabase();
  const profile = useAuthStore((s) => s.profile);
  const store = useAccessibilityStore();

  /** Toggle dyslexia font and persist to DB */
  const toggleDyslexia = useCallback(async () => {
    const newValue = !store.dyslexiaFont;
    store.setDyslexiaFont(newValue);

    if (profile) {
      await supabase
        .from("profiles")
        .update({ dyslexia_font_enabled: newValue })
        .eq("id", profile.id);
    }
  }, [store, profile, supabase]);

  /** Toggle high contrast and persist to DB */
  const toggleContrast = useCallback(async () => {
    const newValue = !store.highContrast;
    store.setHighContrast(newValue);

    if (profile) {
      await supabase
        .from("profiles")
        .update({ high_contrast_enabled: newValue })
        .eq("id", profile.id);
    }
  }, [store, profile, supabase]);

  return {
    dyslexiaFont: store.dyslexiaFont,
    highContrast: store.highContrast,
    toggleDyslexia,
    toggleContrast,
  };
}
