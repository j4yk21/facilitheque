"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useAccessibilityStore } from "@/stores/accessibility-store";

export function useAuth() {
  const { profile, isLoading, setProfile, setLoading } = useAuthStore();
  const { setDyslexiaFont, setHighContrast } = useAccessibilityStore();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (data) {
        setProfile(data);
        setDyslexiaFont(data.dyslexia_font_enabled);
        setHighContrast(data.high_contrast_enabled);
      } else {
        // Profile doesn't exist yet (table missing or row not created).
        // Still set loading to false so the UI can render.
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return { profile, isLoading, signOut };
}
