"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSupabase } from "./use-supabase";
import { useBattleStore } from "@/stores/battle-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  calculateQuestionDamage,
  calculateXpReward,
} from "@/lib/battle/calculate-battle-state";
import { checkAnswer } from "@/lib/battle/check-answer";
import { computeTeamBonuses, type TeamBonuses } from "@/lib/rpg/character-classes";
import type { CharacterClass } from "@/types/database";
import type { Question } from "@/types/question";
import type { BattleLogEntry } from "@/types/battle";

export interface SubmitAnswerResult {
  isCorrect: boolean;
  alreadyAnswered: boolean;
  damage: number;
  xpReward: number;
  bossDefeated: boolean;
  newLevel: number | null;
  leveledUp: boolean;
  /** Solution fields to merge back into the question for result display */
  solution: Partial<Question> | null;
}

/** Submission failed for a reason the student must see. */
export interface SubmitAnswerError {
  error: "session_inactive" | "failed";
}

export type SubmitAnswerOutcome = SubmitAnswerResult | SubmitAnswerError;

export function isSubmitError(
  outcome: SubmitAnswerOutcome
): outcome is SubmitAnswerError {
  return "error" in outcome;
}

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
      // (which can be missed or not published). HP only ever decreases:
      // never overwrite a newer (lower) realtime value with a staler RPC
      // response that raced with a teammate's hit.
      const result = data?.[0];
      if (result) {
        const battleStore = useBattleStore.getState();
        if (result.new_boss_hp < battleStore.currentBossHp) {
          battleStore.updateBossHp(result.new_boss_hp);
        }
      }

      return { damage, xpReward, bossDefeated: result?.boss_defeated ?? false };
    },
    [sessionId, profile, supabase, teamBonuses]
  );

  // Migration 00006 absent (detected once): skip the doomed RPC round
  // trip on every subsequent submission.
  const legacyModeRef = useRef(false);

  // Submit an answer for server-side validation (migration 00006). Falls
  // back to the legacy client-side path (checkAnswer + deal_damage) while
  // the RPC does not exist on the database yet.
  const submitAnswer = useCallback(
    async (
      questionIndex: number,
      question: Question,
      answer: string
    ): Promise<SubmitAnswerOutcome | null> => {
      if (!sessionId || !profile) return null;

      // Legacy local validation — the question still carries its
      // solutions in this mode.
      const runLegacy = async (): Promise<SubmitAnswerOutcome | null> => {
        const isCorrect = checkAnswer(question, answer);
        if (!isCorrect) {
          return {
            isCorrect: false,
            alreadyAnswered: false,
            damage: 0,
            xpReward: 0,
            bossDefeated: false,
            newLevel: null,
            leveledUp: false,
            solution: null,
          };
        }
        const legacy = await dealDamage(question);
        if (!legacy) return { error: "failed" };
        return {
          isCorrect: true,
          alreadyAnswered: false,
          damage: legacy.damage,
          xpReward: legacy.xpReward,
          bossDefeated: legacy.bossDefeated,
          newLevel: null,
          leveledUp: false,
          solution: null,
        };
      };

      if (legacyModeRef.current) return runLegacy();

      const { data, error } = await supabase.rpc("submit_answer", {
        p_session_id: sessionId,
        p_question_index: questionIndex,
        p_answer: answer,
      });

      if (error) {
        if (error.code === "PGRST202" || error.code === "42883") {
          legacyModeRef.current = true;
          return runLegacy();
        }
        console.error("submit_answer error:", error);
        // The student must see WHY nothing happened: paused/ended
        // session vs a transient failure worth retrying.
        return {
          error: error.message?.includes("not active")
            ? "session_inactive"
            : "failed",
        };
      }

      const row = data?.[0];
      if (!row) return null;

      // Same monotonic HP application as dealDamage
      const battleStore = useBattleStore.getState();
      if (row.new_boss_hp < battleStore.currentBossHp) {
        battleStore.updateBossHp(row.new_boss_hp);
      }

      return {
        isCorrect: row.is_correct,
        alreadyAnswered: row.already_answered,
        damage: row.damage,
        xpReward: row.xp,
        bossDefeated: row.boss_defeated,
        newLevel: row.new_level,
        leveledUp: row.leveled_up,
        solution: (row.solution as Partial<Question> | null) ?? null,
      };
    },
    [sessionId, profile, supabase, dealDamage]
  );

  return {
    currentBossHp: store.currentBossHp,
    maxBossHp: store.maxBossHp,
    logs: store.logs,
    participantCount: store.participantCount,
    expectedStudentCount: store.expectedStudentCount,
    teamBonuses,
    dealDamage,
    submitAnswer,
  };
}
