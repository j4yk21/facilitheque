"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useBattle } from "@/hooks/use-battle";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CHARACTER_CLASSES } from "@/lib/rpg/character-classes";
import type { Question } from "@/types/question";

export default function SessionControlPanel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();
  const { getSession, startSession } = useSession();
  const { currentBossHp, maxBossHp, participantCount, logs } = useBattle(id);

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [answerStats, setAnswerStats] = useState<
    Record<number, { correct: number; total: number }>
  >({});

  useEffect(() => {
    getSession(id).then((data) => {
      setSession(data);
      setLoading(false);
    });
  }, [id, getSession]);

  // Follow status changes made elsewhere — most importantly the session
  // flipping to "completed" when the boss dies (done by deal_damage).
  useEffect(() => {
    const channel = supabase
      .channel(`teacher-session:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setSession((prev: any) =>
            prev ? { ...prev, ...payload.new } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  // End-of-session results: who did what, and which questions hurt.
  useEffect(() => {
    if (session?.status !== "completed") return;

    const loadResults = async () => {
      const { data: parts } = await supabase
        .from("session_participants")
        .select(
          "student_id, character_class, damage_dealt, xp_earned, current_question_index, profiles(display_name)"
        )
        .eq("session_id", id)
        .order("damage_dealt", { ascending: false });

      setResults(parts ?? []);

      // session_answers only exists once migration 00006 is applied —
      // silently skip the per-question breakdown before that.
      const { data: answers, error: answersError } = await supabase
        .from("session_answers")
        .select("question_index, is_correct")
        .eq("session_id", id);

      if (!answersError && answers) {
        const stats: Record<number, { correct: number; total: number }> = {};
        for (const a of answers) {
          const s = (stats[a.question_index] ??= { correct: 0, total: 0 });
          s.total++;
          if (a.is_correct) s.correct++;
        }
        setAnswerStats(stats);
      }
    };

    loadResults();
  }, [session?.status, id, supabase]);

  const updateStatus = async (fields: Record<string, unknown>) => {
    setActionError("");
    const { error } = await supabase
      .from("sessions")
      .update(fields)
      .eq("id", id);

    if (error) {
      setActionError(`Could not update the session: ${error.message}`);
      return;
    }
    setSession({ ...session, ...fields });
  };

  const handlePause = () => updateStatus({ status: "paused" });
  const handleResume = () => updateStatus({ status: "active" });
  const handleEnd = () =>
    updateStatus({
      status: "completed",
      completed_at: new Date().toISOString(),
    });

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;
  if (!session)
    return (
      <p className="mt-16 text-center text-gray-500">Session not found.</p>
    );

  const hpPercent = maxBossHp > 0 ? (currentBossHp / maxBossHp) * 100 : 0;
  const bossName = session.templates?.boss_name ?? "Boss";
  const isActive = session.status === "active";
  const isPaused = session.status === "paused";
  const isCompleted = session.status === "completed";
  const isWaiting = session.status === "waiting";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{bossName}</h1>
          <p className="font-mono text-lg tracking-widest text-indigo-600">
            {session.battle_code}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 capitalize">
            {session.status}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/teacher/dashboard")}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Battle code display */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-gray-500">Share this code with students</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-indigo-600">
            {session.battle_code}
          </p>
          <p className="text-sm text-gray-400">
            {participantCount} / {session.expected_student_count} students
            joined
          </p>
        </CardContent>
      </Card>

      {actionError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {isWaiting && (
          <Button
            size="lg"
            className="flex-1"
            onClick={async () => {
              const ok = await startSession(id);
              if (ok) setSession({ ...session, status: "active" });
            }}
          >
            Start Battle
          </Button>
        )}

        {isActive && (
          <>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={handlePause}
            >
              Pause Battle
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={handleEnd}
            >
              End Battle
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button size="lg" className="flex-1" onClick={handleResume}>
              Resume Battle
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={handleEnd}
            >
              End Battle
            </Button>
          </>
        )}

        {isCompleted && (
          <Card className="w-full">
            <CardContent className="py-4 text-center">
              <p className="text-lg font-semibold text-green-600">
                Battle Complete!
              </p>
              <p className="text-sm text-gray-500">
                The boss was {currentBossHp === 0 ? "defeated" : "not fully defeated"}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Boss HP */}
      {(isActive || isPaused || isCompleted) && (
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Boss HP</span>
            <span>
              {currentBossHp} / {maxBossHp}
            </span>
          </div>
          <div className="h-6 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-500"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* End-of-session results */}
      {isCompleted && results.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Résultats des élèves</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Élève</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3 text-right">Dégâts</th>
                    <th className="px-4 py-3 text-right">XP</th>
                    <th className="px-4 py-3 text-right">Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p: any, i: number) => {
                    const cls = p.character_class
                      ? CHARACTER_CLASSES[
                          p.character_class as keyof typeof CHARACTER_CLASSES
                        ]
                      : null;
                    const totalQuestions =
                      (session.templates?.questions as Question[] | undefined)
                        ?.length ?? 0;
                    return (
                      <tr key={p.student_id} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          {i === 0 && "🥇 "}
                          {i === 1 && "🥈 "}
                          {i === 2 && "🥉 "}
                          {p.profiles?.display_name ?? "Élève"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {cls ? cls.name : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {p.damage_dealt}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {p.xp_earned}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {p.current_question_index}
                          {totalQuestions > 0 && ` / ${totalQuestions}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {Object.keys(answerStats).length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Réussite par question
              </h2>
              <div className="space-y-2">
                {((session.templates?.questions as Question[]) ?? []).map(
                  (q, idx) => {
                    const stat = answerStats[idx];
                    const percent = stat
                      ? Math.round((stat.correct / stat.total) * 100)
                      : null;
                    return (
                      <div
                        key={q.id ?? idx}
                        className="rounded-lg border bg-white p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                          <span className="truncate">
                            <span className="font-medium">Q{idx + 1}.</span>{" "}
                            {q.text}
                          </span>
                          <span className="shrink-0 text-gray-500">
                            {stat
                              ? `${stat.correct} / ${stat.total} (${percent}%)`
                              : "aucune réponse"}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={
                              percent != null && percent < 50
                                ? "h-full rounded-full bg-red-400"
                                : "h-full rounded-full bg-green-500"
                            }
                            style={{ width: `${percent ?? 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Les questions en rouge (moins de 50 % de réussite) méritent
                d&apos;être retravaillées en classe.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Battle log */}
      {logs.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Battle Log</h2>
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-gray-50 p-4 space-y-1">
            {[...logs].reverse().map((log, i) => (
              <p key={i} className="text-sm text-gray-600">
                <span className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>{" "}
                {log.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
