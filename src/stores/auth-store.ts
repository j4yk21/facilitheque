import { create } from "zustand";
import type { CharacterClass } from "@/types/database";

interface Profile {
  id: string;
  display_name: string;
  role: "teacher" | "student";
  level: number;
  total_xp: number;
  max_hp: number;
  avatar_url: string | null;
  character_class: CharacterClass | null;
  dyslexia_font_enabled: boolean;
  high_contrast_enabled: boolean;
}

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}));
