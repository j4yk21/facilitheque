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

  useEffect(() => {
    getSession(id).then((data) => {
      setSession(data);
      setLoading(false);
    });
  }, [id, getSession]);

  const handlePause = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "paused" })
      .eq("id", id);
    if (!error) setSession({ ...session, status: "paused" });
  };

  const handleResume = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "active" })
      .eq("id", id);
    if (!error) setSession({ ...session, status: "active" });
  };

  const handleEnd = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) setSession({ ...session, status: "completed" });
  };

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
