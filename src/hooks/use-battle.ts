"use client";

import { useEffect, useCallback, useState } from "react";
import { useSupabase } from "./use-supabase";
import { useBattleStore } from "@/stores/battle-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  calculateQuestionDamage,
  calculateXpReward,
} from "@/lib/battle/calculate-battle-state";
import { computeTeamBonuses, type TeamBonuses } from "@/lib/rpg/character-classes";
import type { CharacterClass } from "@/types/database";
import type { Question } from "@/types/question";
import type { BattleLogEntry } from "@/types/battle";

export function useBattle(sessionId: string | null) {
  const supabase = useSupabase();
  const store = useBattleStore();
  const profile = useAuthStore((s) => s.profile);
  const [teamBonuses, setTeamBonuses] = useState<TeamBonuses | null>(null);

  // Subscribe to real-time session_state updates
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    const fetchState = async () => {
      const [{ data }, { data: sessionRow }] = await Promise.all([
        supabase
          .from("session_state")
          .select("*")
          .eq("session_id", sessionId)
          .single(),
        supabase
          .from("sessions")
          .select("expected_student_count")
          .eq("id", sessionId)
          .single(),
      ]);

      if (data) {
        // After a full page refresh the Zustand store is empty: restore
        // max_boss_hp and expected_student_count or the HP bar shows 0/0
        // and victory can never be detected.
        if (useBattleStore.getState().sessionId !== sessionId) {
          store.setSession(
            sessionId,
            data.max_boss_hp,
            sessionRow?.expected_student_count ?? 0
          );
        }
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

  // Fetch party composition for team bonuses
  useEffect(() => {
    if (!sessionId) return;

    const fetchParty = async () => {
      const { data } = await supabase
        .from("session_participants")
        .select("character_class")
        .eq("session_id", sessionId);

      if (data) {
        const classes = data.map(
          (p: { character_class: CharacterClass | null }) => p.character_class
        );
        setTeamBonuses(computeTeamBonuses(classes));
      }
    };

    fetchParty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Deal damage by answering a question correctly
  const dealDamage = useCallback(
    async (question: Question) => {
      if (!sessionId || !profile) return null;

      const damage = calculateQuestionDamage(
        question,
        undefined,
        profile.character_class,
        teamBonuses
      );
      const xpReward = calculateXpReward(
        damage,
        profile.character_class,
        teamBonuses
      );

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

      // Apply the authoritative HP returned by the RPC immediately so the
      // HP bar and victory detection don't depend on the realtime event
      // (which can be missed or not published).
      const result = data?.[0];
      if (result) {
        useBattleStore.getState().updateBossHp(result.new_boss_hp);
      }

      return { damage, xpReward, bossDefeated: result?.boss_defeated ?? false };
    },
    [sessionId, profile, supabase, teamBonuses]
  );

  return {
    currentBossHp: store.currentBossHp,
    maxBossHp: store.maxBossHp,
    logs: store.logs,
    participantCount: store.participantCount,
    expectedStudentCount: store.expectedStudentCount,
    teamBonuses,
    dealDamage,
  };
}
