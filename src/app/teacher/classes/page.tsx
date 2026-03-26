"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface Classroom {
  id: string;
  name: string;
  invite_token: string;
  created_at: string;
  student_count: number;
}

export default function ClassroomsList() {
  const { profile, isLoading: authLoading } = useAuth();
  const supabase = useSupabase();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profile) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name, invite_token, created_at, classroom_students(count)")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false });

      const items = (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        invite_token: c.invite_token,
        created_at: c.created_at,
        student_count: c.classroom_students?.[0]?.count ?? 0,
      }));

      setClassrooms(items);
      setLoading(false);
    }

    load();
  }, [profile, authLoading, supabase]);

  if (authLoading || loading) {
    return <LoadingSpinner className="mt-32" size="lg" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes Classes</h1>
          <p className="text-gray-500">
            Gerez vos classes et vos groupes d&apos;eleves.
          </p>
        </div>
        <Link href="/teacher/classes/new">
          <Button>Nouvelle Classe</Button>
        </Link>
      </div>

      {classrooms.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">
            Vous n&apos;avez pas encore de classe.
          </p>
          <Link href="/teacher/classes/new">
            <Button className="mt-4">Creer ma premiere classe</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{c.student_count} eleve(s)</span>
                    <span>
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
