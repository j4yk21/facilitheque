"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useBattle } from "@/hooks/use-battle";
import { BossHealthBar } from "@/components/battle/boss-health-bar";
import { QuestionCard } from "@/components/battle/question-card";
import { BattleLog } from "@/components/battle/battle-log";
import { DamageNumberContainer } from "@/components/battle/damage-number";
import { VictoryScreen } from "@/components/battle/victory-screen";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Question } from "@/types/question";

interface FloatingDamage {
  id: string;
  value: number;
  playerName: string;
}

export default function BattleArena({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const { getSession } = useSession();
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
  const [screenShake, setScreenShake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    getSession(sessionId).then((data) => {
      if (data) {
        setSession(data);
        setQuestions((data.templates?.questions as Question[]) ?? []);
      }
      setLoading(false);
    });
  }, [sessionId, getSession]);

  // Check for boss defeat via realtime
  useEffect(() => {
    if (currentBossHp === 0 && maxBossHp > 0) {
      setFinished(true);
    }
  }, [currentBossHp, maxBossHp]);

  const handleAnswer = useCallback(
    async (_answer: string, isCorrect: boolean) => {
      if (isCorrect) {
        const result = await dealDamage(questions[currentQIndex]);

        if (result) {
          setTotalDamage((d) => d + result.damage);
          setTotalXp((x) => x + result.xpReward);

          // Floating damage number
          setFloatingDamages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              value: result.damage,
              playerName: profile?.display_name ?? "You",
            },
          ]);

          // Screen shake
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 400);

          if (result.bossDefeated) {
            setFinished(true);
            return;
          }
        }
      }

      // Move to next question (or loop back)
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex((i) => i + 1);
      } else {
        // All questions answered — wait for boss defeat or show complete message
        setFinished(true);
      }
    },
    [currentQIndex, questions, dealDamage, profile]
  );

  const removeDamage = useCallback((id: string) => {
    setFloatingDamages((prev) => prev.filter((d) => d.id !== id));
  }, []);

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;
  if (!session) {
    return (
      <p className="mt-16 text-center text-gray-400">Battle not found.</p>
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
        onContinue={() => router.push("/student/join")}
      />
    );
  }

  // All questions answered but boss still alive
  if (finished) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <BossHealthBar
          currentHp={currentBossHp}
          maxHp={maxBossHp}
          bossName={bossName}
          className="w-full max-w-xl"
        />
        <p className="text-lg text-gray-300">
          You answered all questions! Waiting for your party to finish...
        </p>
        <BattleLog logs={logs} />
      </div>
    );
  }

  return (
    <motion.div
      animate={screenShake ? { x: [0, -4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-8"
    >
      {/* Boss HP */}
      <div className="relative w-full max-w-xl">
        <BossHealthBar
          currentHp={currentBossHp}
          maxHp={maxBossHp}
          bossName={bossName}
        />
        <DamageNumberContainer
          damages={floatingDamages}
          onRemove={removeDamage}
        />
      </div>

      {/* Party counter */}
      <div className="flex gap-6 text-sm text-gray-400">
        <span>
          Party: {participantCount} / {expectedStudentCount}
        </span>
        <span>Your damage: {totalDamage}</span>
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
    </motion.div>
  );
}
