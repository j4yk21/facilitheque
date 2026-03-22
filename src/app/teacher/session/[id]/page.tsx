"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useBattle } from "@/hooks/use-battle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function SessionControlPanel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useAuth();
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

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;
  if (!session) return <p className="mt-16 text-center text-gray-500">Session not found.</p>;

  const hpPercent = maxBossHp > 0 ? (currentBossHp / maxBossHp) * 100 : 0;
  const bossName = session.templates?.boss_name ?? "Boss";

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
        <div className="text-right">
          <span className="text-sm text-gray-500 capitalize">
            Status: {session.status}
          </span>
        </div>
      </div>

      {/* Battle code display for sharing */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-gray-500">Share this code with students</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-indigo-600">
            {session.battle_code}
          </p>
          <p className="text-sm text-gray-400">
            {participantCount} / {session.expected_student_count} students joined
          </p>
        </CardContent>
      </Card>

      {/* Start button */}
      {session.status === "waiting" && (
        <Button
          size="lg"
          className="w-full"
          onClick={async () => {
            const ok = await startSession(id);
            if (ok) setSession({ ...session, status: "active" });
          }}
        >
          Start Battle
        </Button>
      )}

      {/* Boss HP (visible once active/completed) */}
      {(session.status === "active" || session.status === "completed") && (
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
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-gray-50 p-4">
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
