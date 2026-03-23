"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { useSession } from "@/hooks/use-session";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { BOSS_AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/question";

export default function EditTemplate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();
  const { deleteTemplate } = useSession();

  const [bossName, setBossName] = useState("");
  const [bossAvatarId, setBossAvatarId] = useState("default_boss");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBossName(data.boss_name);
          setBossAvatarId(data.boss_avatar_id);
          setQuestions(data.questions as Question[]);
        }
        setLoading(false);
      });
  }, [id, supabase]);

  const handleSave = async () => {
    if (!bossName.trim()) return setError("Boss name is required");
    if (questions.length === 0)
      return setError("Add at least one question");

    setSaving(true);
    setError("");

    const { error: dbError } = await supabase
      .from("templates")
      .update({
        boss_name: bossName.trim(),
        boss_avatar_id: bossAvatarId,
        questions,
      })
      .eq("id", id);

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    router.push("/teacher/dashboard");
  };

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Edit Template</h1>

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
      />

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

      <div>
        <h2 className="mb-3 text-lg font-semibold">Questions</h2>
        <QuestionEditor questions={questions} onChange={setQuestions} />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} isLoading={saving}>
          Save Changes
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          Delete
        </Button>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Template"
      >
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete &quot;{bossName}&quot;? This cannot be
          undone. Sessions using this template will not be affected.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await deleteTemplate(id);
              if (ok) router.push("/teacher/dashboard");
            }}
          >
            Delete Template
          </Button>
        </div>
      </Modal>
    </div>
  );
}
