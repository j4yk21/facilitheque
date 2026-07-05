"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { CharacterSelector } from "@/components/rpg/character-selector";
import { CHARACTER_CLASSES } from "@/lib/rpg/character-classes";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AccessibilityToggle } from "@/components/shared/accessibility-toggle";
import { xpIntoLevel, levelProgressPercent, XP_PER_LEVEL } from "@/lib/rpg/level";
import { formatXP } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CharacterClass } from "@/types/database";

interface SessionHistory {
  id: string;
  session_id: string;
  damage_dealt: number;
  xp_earned: number;
  joined_at: string;
  sessions: {
    status: string;
    templates: {
      boss_name: string;
    } | null;
  } | null;
}

export default function StudentDashboard() {
  const { profile, isLoading: authLoading } = useAuth();
  const supabase = useSupabase();
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalDamage: 0,
    wins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profile) {
      setLoading(false);
      return;
    }

    async function load() {
      // Post-00006 students cannot read templates directly: the history
      // (with boss names) comes from a SECURITY DEFINER RPC. Fall back to
      // the legacy embed while the migration is not applied.
      let sessions: SessionHistory[] = [];

      const { data: rpcRows, error: rpcError } = await supabase.rpc(
        "get_my_battle_history",
        { p_limit: 20 }
      );

      if (!rpcError && rpcRows) {
        sessions = (rpcRows as any[]).map((h) => ({
          id: h.id,
          session_id: h.session_id,
          damage_dealt: h.damage_dealt,
          xp_earned: h.xp_earned,
          joined_at: h.joined_at,
          sessions: {
            status: h.session_status,
            templates: { boss_name: h.boss_name },
          },
        }));
      } else {
        const { data } = await supabase
          .from("session_participants")
          .select("id, session_id, damage_dealt, xp_earned, joined_at, sessions(status, templates(boss_name))")
          .eq("student_id", profile!.id)
          .order("joined_at", { ascending: false })
          .limit(20);

        sessions = (data ?? []) as unknown as SessionHistory[];
      }

      setHistory(sessions);

      setStats({
        totalSessions: sessions.length,
        totalDamage: sessions.reduce((sum, s) => sum + s.damage_dealt, 0),
        wins: sessions.filter((s) => s.sessions?.status === "completed").length,
      });

      setLoading(false);
    }

    load();
  }, [profile, authLoading, supabase]);

  const handleSelectClass = async (cls: CharacterClass) => {
    if (!profile) return;

    await supabase
      .from("profiles")
      .update({ character_class: cls })
      .eq("id", profile.id);

    // Reload page to reflect change in auth store
    window.location.reload();
  };

  if (authLoading || loading) {
    return <LoadingSpinner className="mt-32" size="lg" />;
  }

  if (!profile) {
    return (
      <div className="mt-16 text-center text-gray-400">
        <p>Connecte-toi pour acceder a ton dashboard.</p>
        <Link href="/login">
          <Button className="mt-4">Se connecter</Button>
        </Link>
      </div>
    );
  }

  const cls = profile.character_class
    ? CHARACTER_CLASSES[profile.character_class]
    : null;

  const xpProgress = xpIntoLevel(profile.total_xp);
  const xpPercent = levelProgressPercent(profile.total_xp);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-400">Mon Dashboard</h1>
        <div className="flex items-center gap-3">
          <AccessibilityToggle theme="dark" />
          <Link href="/student/join">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Rejoindre un combat
            </Button>
          </Link>
        </div>
      </div>

      {/* Player card */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-6">
        <div className="flex items-center gap-4">
          {cls ? (
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-2xl font-bold",
                cls.color
              )}
            >
              {cls.icon}
            </span>
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-2xl text-gray-500">
              ?
            </span>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {profile.display_name}
            </h2>
            <p className="text-sm text-gray-400">
              {cls ? cls.name : "Aucune classe choisie"} — Niveau{" "}
              {profile.level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-400">
              {formatXP(profile.total_xp)}
            </p>
            <p className="text-xs text-gray-500">total</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Niveau {profile.level}</span>
            <span>
              {xpProgress} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
          <p className="text-xs text-gray-500">Combats</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {stats.totalDamage}
          </p>
          <p className="text-xs text-gray-500">Degats totaux</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
          <p className="text-xs text-gray-500">Victoires</p>
        </div>
      </div>

      {/* Character class selector */}
      <CharacterSelector
        currentClass={profile.character_class}
        onSelect={handleSelectClass}
      />

      {/* Session history */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-200">
            Historique des combats
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-200">
                    {h.sessions?.templates?.boss_name ?? "Boss inconnu"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(h.joined_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-yellow-400">{h.damage_dealt} dmg</span>
                  <span className="text-cyan-400">
                    {formatXP(h.xp_earned)}
                  </span>
                  <span
                    className={
                      h.sessions?.status === "completed"
                        ? "text-green-400"
                        : "text-gray-500"
                    }
                  >
                    {h.sessions?.status === "completed" ? "Victoire" : "En cours"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
