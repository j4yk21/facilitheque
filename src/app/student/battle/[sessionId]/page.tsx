"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useBattle } from "@/hooks/use-battle";
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
    dealDamage,
  } = useBattle(sessionId);

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffectData[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  // Party members for the isometric scene
  const [party, setParty] = useState<PartyMember[]>([]);

  // Load session + restore progress + fetch party
  useEffect(() => {
    async function init() {
      const data = await getSession(sessionId);
      if (data) {
        setSession(data);
        const qs = (data.templates?.questions as Question[]) ?? [];
        setQuestions(qs);

        // Restore student progress
        const progress = await getParticipantProgress(sessionId);
        if (progress) {
          setTotalDamage(progress.damage_dealt);
          setTotalXp(progress.xp_earned);

          if (progress.current_question_index >= qs.length) {
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

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

  const handleAnswer = useCallback(
    async (_answer: string, isCorrect: boolean) => {
      if (isCorrect) {
        const result = await dealDamage(questions[currentQIndex]);

        if (result) {
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
      }

      // Move to next question or finish
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
      dealDamage,
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
  if (!session) {
    return (
      <p className="mt-16 text-center text-gray-400">Combat introuvable.</p>
    );
  }

  const bossName = session.templates?.boss_name ?? "Boss";

  // Victory screen
  if (finished && currentBossHp === 0) {
    return (
      <VictoryScreen
        bossName={bossName}
        totalDamage={totalDamage}
        xpEarned={totalXp}
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
          Tu as repondu a toutes les questions ! En attente du reste de l'equipe...
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

      {/* Question */}
      {questions[currentQIndex] && (
        <QuestionCard
          question={questions[currentQIndex]}
          questionIndex={currentQIndex}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
        />
      )}

      {/* Battle log */}
      <BattleLog logs={logs} className="w-full max-w-xl" />
    </div>
  );
}
