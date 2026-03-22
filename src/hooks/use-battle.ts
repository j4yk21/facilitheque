"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "./use-supabase";
import { useBattleStore } from "@/stores/battle-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  calculateQuestionDamage,
  calculateXpReward,
} from "@/lib/battle/calculate-battle-state";
import type { Question } from "@/types/question";
import type { BattleLogEntry } from "@/types/battle";

export function useBattle(sessionId: string | null) {
  const supabase = useSupabase();
  const store = useBattleStore();
  const profile = useAuthStore((s) => s.profile);

  // Subscribe to real-time session_state updates
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    const fetchState = async () => {
      const { data } = await supabase
        .from("session_state")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        store.updateBossHp(data.current_boss_hp);
        store.setLogs((data.logs as BattleLogEntry[]) ?? []);
      }
    };

    fetchState();

    // Real-time subscription
    const channel = supabase
      .channel(`session_state:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_state",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newState = payload.new as {
            current_boss_hp: number;
            logs: BattleLogEntry[];
          };
          store.updateBossHp(newState.current_boss_hp);
          store.setLogs(newState.logs ?? []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Subscribe to participant count
  useEffect(() => {
    if (!sessionId) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from("session_participants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      store.setParticipantCount(count ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Deal damage by answering a question correctly
  const dealDamage = useCallback(
    async (question: Question) => {
      if (!sessionId || !profile) return null;

      const damage = calculateQuestionDamage(question);
      const xpReward = calculateXpReward(damage);

      const logEntry: BattleLogEntry = {
        timestamp: new Date().toISOString(),
        student_id: profile.id,
        event: "damage",
        value: damage,
        message: `${profile.display_name} dealt ${damage} damage!`,
      };

      const { data, error } = await supabase.rpc("deal_damage", {
        p_session_id: sessionId,
        p_student_id: profile.id,
        p_damage: damage,
        p_xp_reward: xpReward,
        p_log_entry: logEntry,
      });

      if (error) {
        console.error("deal_damage error:", error);
        return null;
      }

      return { damage, xpReward, bossDefeated: data?.[0]?.boss_defeated ?? false };
    },
    [sessionId, profile, supabase]
  );

  return {
    currentBossHp: store.currentBossHp,
    maxBossHp: store.maxBossHp,
    logs: store.logs,
    participantCount: store.participantCount,
    expectedStudentCount: store.expectedStudentCount,
    dealDamage,
  };
}
