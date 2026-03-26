"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewClassroom() {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Veuillez entrer un nom pour la classe.");
      return;
    }

    setCreating(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("classrooms")
      .insert({ teacher_id: profile.id, name: trimmed })
      .select()
      .single();

    setCreating(false);

    if (dbError || !data) {
      setError("Erreur lors de la creation. Reessayez.");
      return;
    }

    router.push(`/teacher/classes/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Nouvelle Classe</h1>
        <p className="text-gray-500">
          Creez une classe pour y ajouter vos eleves.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        label="Nom de la classe"
        id="class-name"
        placeholder="Ex: 3eme B - Maths"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        autoFocus
      />

      <div className="flex gap-3">
        <Button onClick={handleCreate} isLoading={creating}>
          Creer la classe
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
