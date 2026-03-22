"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { BOSS_AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/question";

export default function NewTemplate() {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();

  const [bossName, setBossName] = useState("");
  const [bossAvatarId, setBossAvatarId] = useState<string>("default_boss");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!profile) return;
    if (!bossName.trim()) return setError("Boss name is required");
    if (questions.length === 0)
      return setError("Add at least one question");

    const incomplete = questions.find((q) => !q.text || !q.correct_answer);
    if (incomplete) return setError("All questions must have text and a correct answer");

    setSaving(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("templates")
      .insert({
        teacher_id: profile.id,
        boss_name: bossName.trim(),
        boss_avatar_id: bossAvatarId,
        questions,
      })
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    router.push("/teacher/dashboard");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Create New Boss</h1>
        <p className="text-gray-500">
          Design a quiz that students will fight as a boss battle.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        label="Boss Name"
        id="boss-name"
        value={bossName}
        onChange={(e) => setBossName(e.target.value)}
        placeholder="e.g. The Algebra Dragon"
      />

      {/* Avatar selector */}
      <div>
        <label className="mb-2 block text-sm font-medium">Boss Avatar</label>
        <div className="flex flex-wrap gap-3">
          {BOSS_AVATARS.map((avatarId) => (
            <button
              key={avatarId}
              onClick={() => setBossAvatarId(avatarId)}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-lg border-2 text-2xl transition-colors",
                bossAvatarId === avatarId
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
              title={avatarId}
            >
              {avatarId === "dragon" && "🐉"}
              {avatarId === "skeleton_king" && "💀"}
              {avatarId === "dark_wizard" && "🧙"}
              {avatarId === "golem" && "🪨"}
              {avatarId === "hydra" && "🐍"}
              {avatarId === "default_boss" && "👹"}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Questions</h2>
        <QuestionEditor questions={questions} onChange={setQuestions} />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} isLoading={saving}>
          Save Template
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
