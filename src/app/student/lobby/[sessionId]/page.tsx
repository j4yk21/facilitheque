"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useBattle } from "@/hooks/use-battle";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { formatXP } from "@/lib/utils";

export default function BattleLobby({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const { getSession } = useSession();
  const { participantCount, expectedStudentCount } = useBattle(sessionId);
  const supabase = useSupabase();

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    getSession(sessionId).then(setSession);
  }, [sessionId, getSession]);

  // Listen for session status change to "active"
  useEffect(() => {
    const channel = supabase
      .channel(`session-status:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.status === "active") {
            router.push(`/student/battle/${sessionId}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router, supabase]);

  const bossName = session?.templates?.boss_name ?? "???";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8">
      {/* Boss preview */}
      <div className="text-center">
        <p className="mb-1 text-sm uppercase tracking-widest text-gray-500">
          Upcoming Battle
        </p>
        <h1 className="text-4xl font-bold text-purple-400">{bossName}</h1>
      </div>

      {/* Animated waiting indicator */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-3 w-3 animate-bounce rounded-full bg-purple-500"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-gray-400">Waiting for the teacher to start...</p>
      </div>

      {/* Party counter */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-8 py-6 text-center">
        <p className="text-sm text-gray-400">Party Size</p>
        <p className="text-5xl font-bold text-white">
          {participantCount}
          <span className="text-2xl text-gray-500">
            {" "}
            / {expectedStudentCount || "?"}
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-500">warriors assembled</p>
      </div>

      {/* Player stats */}
      {profile && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-6 py-4 text-center">
          <p className="font-medium text-gray-200">{profile.display_name}</p>
          <p className="text-sm text-gray-400">
            Level {profile.level} — {formatXP(profile.total_xp)}
          </p>
        </div>
      )}
    </div>
  );
}
