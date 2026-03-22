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
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
          setDyslexiaFont(data.dyslexia_font_enabled);
          setHighContrast(data.high_contrast_enabled);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setDyslexiaFont(data.dyslexia_font_enabled);
        setHighContrast(data.high_contrast_enabled);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return { profile, isLoading, signOut };
}
