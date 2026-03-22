"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NewSession() {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();
  const { createSession } = useSession();

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [studentCount, setStudentCount] = useState("5");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("templates")
      .select("id, boss_name, questions")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates(data ?? []));
  }, [profile, supabase]);

  const handleLaunch = async () => {
    if (!selectedTemplate) return setError("Select a template");
    const count = parseInt(studentCount);
    if (!count || count <= 0) return setError("Enter a valid student count");

    setLaunching(true);
    setError("");

    const session = await createSession(selectedTemplate, count);

    setLaunching(false);

    if (!session) {
      setError("Failed to create session. Try again.");
      return;
    }

    router.push(`/teacher/session/${session.id}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Launch a Battle</h1>
        <p className="text-gray-500">
          Choose a template and set the expected number of students.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Template picker */}
      <div>
        <label className="mb-2 block text-sm font-medium">Select Template</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t: any) => (
            <button key={t.id} onClick={() => setSelectedTemplate(t.id)}>
              <Card
                className={
                  selectedTemplate === t.id
                    ? "ring-2 ring-indigo-500"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle>{t.boss_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-gray-500">
                    {(t.questions as unknown[]).length} questions
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
        {templates.length === 0 && (
          <p className="text-sm text-gray-400">
            No templates found. Create one first.
          </p>
        )}
      </div>

      <Input
        label="Expected number of students"
        id="student-count"
        type="number"
        min="1"
        max="50"
        value={studentCount}
        onChange={(e) => setStudentCount(e.target.value)}
      />

      <div className="flex gap-3">
        <Button onClick={handleLaunch} isLoading={launching}>
          Launch Battle
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
