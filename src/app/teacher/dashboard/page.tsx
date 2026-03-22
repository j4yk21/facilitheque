"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { TemplateList } from "@/components/dashboard/template-list";
import { SessionCard } from "@/components/dashboard/session-card";
import { AccessibilityToggle } from "@/components/shared/accessibility-toggle";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function TeacherDashboard() {
  const { profile, isLoading: authLoading, signOut } = useAuth();
  const supabase = useSupabase();
  const [templates, setTemplates] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const [tRes, sRes] = await Promise.all([
        supabase
          .from("templates")
          .select("*")
          .eq("teacher_id", profile!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("sessions")
          .select("*, templates(boss_name)")
          .eq("teacher_id", profile!.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setTemplates(tRes.data ?? []);
      setSessions(sRes.data ?? []);
      setLoading(false);
    }

    load();
  }, [profile, supabase]);

  if (authLoading || loading) {
    return <LoadingSpinner className="mt-32" size="lg" />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="text-gray-500">Manage your quizzes and battles</p>
        </div>
        <div className="flex items-center gap-4">
          <AccessibilityToggle />
          <Button variant="ghost" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/teacher/templates/new">
          <Button>New Template</Button>
        </Link>
        <Link href="/teacher/session/new">
          <Button variant="secondary">Launch Battle</Button>
        </Link>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent Battles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s: any) => (
              <SessionCard
                key={s.id}
                session={s}
                bossName={s.templates?.boss_name}
              />
            ))}
          </div>
        </section>
      )}

      {/* Templates */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Your Templates</h2>
        <TemplateList templates={templates} />
      </section>
    </div>
  );
}
