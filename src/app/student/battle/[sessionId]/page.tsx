"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import {
  useBattle,
  isSubmitError,
  type SubmitAnswerResult,
} from "@/hooks/use-battle";
import { IsometricScene, type PartyMember } from "@/components/battle/isometric-scene";
import { QuestionCard } from "@/components/battle/question-card";
import { BattleLog } from "@/components/battle/battle-log";
import { VictoryScreen } from "@/components/battle/victory-screen";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useSupabase } from "@/hooks/use-supabase";
import type { Question } from "@/types/question";
import type { CharacterClass } from "@/types/database";

interface FloatingDamage {
  id: string;
  value: number;
  playerName: string;
}

interface AttackEffectData {
  id: string;
  characterClass: CharacterClass;
  damage: number;
}

export default function BattleArena({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();
  const { getSession, getParticipantProgress, updateQuestionProgress } =
    useSession();
  const {
    currentBossHp,
    maxBossHp,
    logs,
    participantCount,
    expectedStudentCount,
    submitAnswer,
  } = useBattle(sessionId);

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bossName, setBossName] = useState("Boss");
  const [reachedLevel, setReachedLevel] = useState<number | null>(null);
  const lastResultRef = useRef<SubmitAnswerResult | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffectData[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  // Party members for the isometric scene
  const [party, setParty] = useState<PartyMember[]>([]);

  // Load session + restore progress + fetch party
  useEffect(() => {
    async function init() {
      const data = await getSession(sessionId);
      if (data) {
        setSession(data);

        // Sanitized questions via RPC (no solutions in the payload).
        // Falls back to the embedded template while migration 00006 is
        // not applied — in that mode the questions still carry solutions
        // and validation happens locally.
        let qs: Question[] = [];
        let name = data.templates?.boss_name ?? "Boss";

        const { data: payload, error: rpcError } = await supabase.rpc(
          "get_battle_questions",
          { p_session_id: sessionId }
        );

        if (!rpcError && payload) {
          const p = payload as {
            boss_name?: string;
            questions?: Question[];
          };
          qs = p.questions ?? [];
          name = p.boss_name ?? name;
        } else if (
          rpcError &&
          (rpcError.code === "PGRST202" || rpcError.code === "42883")
        ) {
          // Migration 00006 absent: the template embed still carries the
          // questions for students.
          qs = (data.templates?.questions as Question[]) ?? [];
        } else {
          // Transient failure (network, 5xx): with the template embed
          // hidden post-00006 we would continue with zero questions and
          // show a bogus "all answered" screen — surface a retry instead.
          console.error("get_battle_questions error:", rpcError);
          setLoadError(true);
          setLoading(false);
          return;
        }

        setQuestions(qs);
        setBossName(name);

        // Restore student progress
        const progress = await getParticipantProgress(sessionId);
        if (progress) {
          setTotalDamage(progress.damage_dealt);
          setTotalXp(progress.xp_earned);

          if (qs.length > 0 && progress.current_question_index >= qs.length) {
            setFinished(true);
          } else {
            setCurrentQIndex(progress.current_question_index);
          }
        }
      }

      // Fetch party members
      const { data: participants } = await supabase
        .from("session_participants")
        .select("student_id, character_class, profiles(display_name)")
        .eq("session_id", sessionId);

      if (participants) {
        const members: PartyMember[] = participants.map((p: any) => ({
          id: p.student_id,
          name: p.profiles?.display_name ?? "Joueur",
          characterClass: p.character_class ?? "warrior",
          state: "idle" as const,
        }));
        setParty(members);
      }

      setLoading(false);
    }

    setLoadError(false);
    setLoading(true);
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, retryKey]);

  // React to the teacher pausing or ending the session while answering
  useEffect(() => {
    const channel = supabase
      .channel(`battle-session-status:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setLiveStatus((payload.new as { status?: string }).status ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // Check for boss defeat via realtime
  useEffect(() => {
    if (currentBossHp === 0 && maxBossHp > 0) {
      // Trigger victory animations for all party members
      setParty((prev) =>
        prev.map((m) => ({ ...m, state: "victory" as const }))
      );
      setTimeout(() => setFinished(true), 2000);
    }
  }, [currentBossHp, maxBossHp]);

  // Server-side validation for the current question. Called by the
  // QuestionCard BEFORE it shows the verdict: the full result is cached
  // for handleAnswer, and the revealed solution is merged back into the
  // question so the result display works on sanitized questions.
  const checkCurrentAnswer = useCallback(
    async (answer: string) => {
      const question = questions[currentQIndex];
      if (!question) return null;

      const outcome = await submitAnswer(currentQIndex, question, answer);
      if (!outcome) return null;

      if (isSubmitError(outcome)) {
        return { error: outcome.error };
      }

      lastResultRef.current = outcome;

      if (outcome.solution) {
        const solution = outcome.solution;
        setQuestions((prev) =>
          prev.map((q, i) =>
            i === currentQIndex ? { ...q, ...solution } : q
          )
        );
      }

      if (outcome.leveledUp && outcome.newLevel) {
        setReachedLevel(outcome.newLevel);
      }

      return { isCorrect: outcome.isCorrect };
    },
    [questions, currentQIndex, submitAnswer]
  );

  const handleAnswer = useCallback(
    async (_answer: string, isCorrect: boolean) => {
      const result = lastResultRef.current;
      lastResultRef.current = null;

      if (isCorrect && result && result.damage > 0) {
        setTotalDamage((d) => d + result.damage);
        setTotalXp((x) => x + result.xpReward);

        const myClass = profile?.character_class ?? "warrior";

        // Trigger attack animation for current player
        setParty((prev) =>
          prev.map((m) =>
            m.id === profile?.id
              ? { ...m, state: "attack" as const }
              : m
          )
        );

        // Reset to idle after attack
        setTimeout(() => {
          setParty((prev) =>
            prev.map((m) =>
              m.id === profile?.id
                ? { ...m, state: "idle" as const }
                : m
            )
          );
        }, 700);

        // Attack effect
        setAttackEffects((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            characterClass: myClass,
            damage: result.damage,
          },
        ]);

        // Floating damage number
        setFloatingDamages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            value: result.damage,
            playerName: profile?.display_name ?? "Toi",
          },
        ]);

        // Screen shake
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 500);

        if (result.bossDefeated) {
          await updateQuestionProgress(sessionId, currentQIndex + 1);
          return;
        }
      }

      // Move to next question or finish. Progress is also advanced
      // server-side by submit_answer; this call covers the legacy path
      // and is monotonic either way.
      const nextIndex = currentQIndex + 1;
      await updateQuestionProgress(sessionId, nextIndex);

      if (nextIndex < questions.length) {
        setCurrentQIndex(nextIndex);
      } else {
        setFinished(true);
      }
    },
    [
      currentQIndex,
      questions,
      profile,
      sessionId,
      updateQuestionProgress,
    ]
  );

  const removeDamage = useCallback((id: string) => {
    setFloatingDamages((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removeEffect = useCallback((id: string) => {
    setAttackEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-bold text-red-400">
          Impossible de charger le combat
        </h1>
        <p className="text-gray-400">
          V&eacute;rifie ta connexion puis r&eacute;essaie.
        </p>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
        >
          R&eacute;essayer
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="mt-16 text-center text-gray-400">Combat introuvable.</p>
    );
  }

  const sessionStatus = liveStatus ?? session.status;

  // Teacher ended the battle before the boss died
  if (sessionStatus === "completed" && currentBossHp > 0 && !finished) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-purple-300">
          Le combat a &eacute;t&eacute; termin&eacute; par ton professeur
        </h1>
        <p className="text-gray-400">
          Tes d&eacute;g&acirc;ts&nbsp;: {totalDamage} — XP gagn&eacute;e&nbsp;:
          {" "}{totalXp}
        </p>
        <button
          onClick={() => router.push("/student/dashboard")}
          className="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  // Victory screen
  if (finished && currentBossHp === 0) {
    return (
      <VictoryScreen
        bossName={bossName}
        totalDamage={totalDamage}
        xpEarned={totalXp}
        newLevel={reachedLevel}
        onContinue={() => router.push("/student/dashboard")}
      />
    );
  }

  // All questions answered but boss still alive
  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6">
        <IsometricScene
          party={party}
          bossName={bossName}
          currentBossHp={currentBossHp}
          maxBossHp={maxBossHp}
          floatingDamages={floatingDamages}
          attackEffects={attackEffects}
          onRemoveDamage={removeDamage}
          onRemoveEffect={removeEffect}
          screenShake={false}
        />
        <motion.p
          className="text-lg text-gray-300"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Tu as r&eacute;pondu &agrave; toutes les questions ! En attente du reste de l&apos;&eacute;quipe...
        </motion.p>
        <BattleLog logs={logs} className="w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Isometric battle scene */}
      <IsometricScene
        party={party}
        bossName={bossName}
        currentBossHp={currentBossHp}
        maxBossHp={maxBossHp}
        floatingDamages={floatingDamages}
        attackEffects={attackEffects}
        onRemoveDamage={removeDamage}
        onRemoveEffect={removeEffect}
        screenShake={screenShake}
      />

      {/* Party counter */}
      <div className="flex gap-6 text-sm text-gray-400">
        <span>
          Equipe: {participantCount} / {expectedStudentCount}
        </span>
        <span>Tes degats: {totalDamage}</span>
      </div>

      {/* Paused by the teacher */}
      {sessionStatus === "paused" && (
        <div className="rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-6 py-3 text-center text-sm font-medium text-yellow-300">
          &#9208; Combat en pause — attends que ton professeur reprenne la
          partie.
        </div>
      )}

      {/* Question */}
      {questions[currentQIndex] && (
        <QuestionCard
          question={questions[currentQIndex]}
          questionIndex={currentQIndex}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          checkAnswerAsync={checkCurrentAnswer}
          disabled={sessionStatus === "paused"}
        />
      )}

      {/* Battle log */}
      <BattleLog logs={logs} className="w-full max-w-xl" />
    </div>
  );
}
