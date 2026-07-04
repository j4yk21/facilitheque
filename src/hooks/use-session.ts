"use client";

import { useCallback } from "react";
import { useSupabase } from "./use-supabase";
import { useBattleStore } from "@/stores/battle-store";
import { useAuthStore } from "@/stores/auth-store";
import { generateBattleCode } from "@/lib/battle/battle-code";
import { calculateBattleState } from "@/lib/battle/calculate-battle-state";
import type { Question } from "@/types/question";

export function useSession() {
  const supabase = useSupabase();
  const profile = useAuthStore((s) => s.profile);
  const battleStore = useBattleStore();

  /** Teacher: create a new session from a template */
  const createSession = useCallback(
    async (templateId: string, expectedStudentCount: number) => {
      if (!profile) return null;

      // Fetch template questions
      const { data: template } = await supabase
        .from("templates")
        .select("questions")
        .eq("id", templateId)
        .single();

      if (!template) return null;

      const questions = template.questions as Question[];
      const battleState = calculateBattleState(expectedStudentCount, questions);

      // Generate unique battle code (retry on collision)
      let battleCode = generateBattleCode();
      let retries = 3;

      while (retries > 0) {
        const { data: session, error } = await supabase
          .from("sessions")
          .insert({
            template_id: templateId,
            teacher_id: profile.id,
            battle_code: battleCode,
            expected_student_count: expectedStudentCount,
            status: "waiting",
          })
          .select()
          .single();

        if (!error && session) {
          // Create session_state
          await supabase.from("session_state").insert({
            session_id: session.id,
            current_boss_hp: battleState.max_boss_hp,
            max_boss_hp: battleState.max_boss_hp,
          });

          battleStore.setSession(
            session.id,
            battleState.max_boss_hp,
            expectedStudentCount
          );

          return session;
        }

        // If battle_code collision, retry
        if (error?.code === "23505") {
          battleCode = generateBattleCode();
          retries--;
        } else {
          console.error("createSession error:", error);
          return null;
        }
      }

      return null;
    },
    [profile, supabase, battleStore]
  );

  /** Teacher: start a waiting session */
  const startSession = useCallback(
    async (sessionId: string) => {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", sessionId);

      return !error;
    },
    [supabase]
  );

  /** Student: join a session by battle code */
  const joinSession = useCallback(
    async (battleCode: string) => {
      if (!profile) return null;

      // Lookup goes through a SECURITY DEFINER RPC: students can no longer
      // enumerate waiting sessions (and their battle codes) via SELECT.
      const { data: rows, error: lookupError } = await supabase.rpc(
        "get_session_by_battle_code",
        { p_battle_code: battleCode.toUpperCase() }
      );

      if (lookupError) {
        console.error("joinSession lookup error:", lookupError);
        return null;
      }

      const session = rows?.[0];
      if (!session) return null;

      // Insert participant with character class snapshot
      const { error } = await supabase.from("session_participants").insert({
        session_id: session.id,
        student_id: profile.id,
        character_class: profile.character_class ?? null,
      });

      if (error && error.code !== "23505") {
        // 23505 = already joined, which is fine
        console.error("joinSession error:", error);
        return null;
      }

      if (session.max_boss_hp != null) {
        battleStore.setSession(
          session.id,
          session.max_boss_hp,
          session.expected_student_count
        );
        battleStore.updateBossHp(
          session.current_boss_hp ?? session.max_boss_hp
        );
      }

      return session;
    },
    [profile, supabase, battleStore]
  );

  /** Fetch a session by ID */
  const getSession = useCallback(
    async (sessionId: string) => {
      const { data } = await supabase
        .from("sessions")
        .select("*, templates(*), session_state(*)")
        .eq("id", sessionId)
        .single();

      return data;
    },
    [supabase]
  );

  /** Teacher: delete a template */
  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      return !error;
    },
    [supabase]
  );

  /** Student: get current progress in a session */
  const getParticipantProgress = useCallback(
    async (sessionId: string) => {
      if (!profile) return null;

      const { data } = await supabase
        .from("session_participants")
        .select("current_question_index, damage_dealt, xp_earned")
        .eq("session_id", sessionId)
        .eq("student_id", profile.id)
        .single();

      return data;
    },
    [profile, supabase]
  );

  /** Student: update question progress */
  const updateQuestionProgress = useCallback(
    async (sessionId: string, questionIndex: number) => {
      if (!profile) return;

      const { error } = await supabase
        .from("session_participants")
        .update({ current_question_index: questionIndex })
        .eq("session_id", sessionId)
        .eq("student_id", profile.id);

      if (error) {
        // Surface silently-dropped saves: a failed write here means the
        // student will re-answer questions after a refresh.
        console.error("updateQuestionProgress error:", error);
      }
    },
    [profile, supabase]
  );

  return {
    createSession,
    startSession,
    joinSession,
    getSession,
    deleteTemplate,
    getParticipantProgress,
    updateQuestionProgress,
  };
}
