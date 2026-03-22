import { create } from "zustand";
import type { BattleLogEntry } from "@/types/battle";

interface BattleStore {
  sessionId: string | null;
  currentBossHp: number;
  maxBossHp: number;
  logs: BattleLogEntry[];
  participantCount: number;
  expectedStudentCount: number;

  setSession: (sessionId: string, maxBossHp: number, expectedStudentCount: number) => void;
  updateBossHp: (hp: number) => void;
  addLog: (entry: BattleLogEntry) => void;
  setLogs: (logs: BattleLogEntry[]) => void;
  setParticipantCount: (count: number) => void;
  reset: () => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
  sessionId: null,
  currentBossHp: 0,
  maxBossHp: 0,
  logs: [],
  participantCount: 0,
  expectedStudentCount: 0,

  setSession: (sessionId, maxBossHp, expectedStudentCount) =>
    set({ sessionId, maxBossHp, currentBossHp: maxBossHp, expectedStudentCount }),

  updateBossHp: (hp) => set({ currentBossHp: hp }),

  addLog: (entry) => set((state) => ({ logs: [...state.logs, entry] })),

  setLogs: (logs) => set({ logs }),

  setParticipantCount: (count) => set({ participantCount: count }),

  reset: () =>
    set({
      sessionId: null,
      currentBossHp: 0,
      maxBossHp: 0,
      logs: [],
      participantCount: 0,
      expectedStudentCount: 0,
    }),
}));
