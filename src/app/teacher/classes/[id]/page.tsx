"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CHARACTER_CLASSES } from "@/lib/rpg/character-classes";
import { cn } from "@/lib/utils";
import type { CharacterClass } from "@/types/database";

type StudentStatus = "pending" | "approved" | "rejected";

interface Student {
  id: string;
  student_id: string;
  status: StudentStatus;
  profiles: {
    display_name: string;
    level: number;
    total_xp: number;
    character_class: CharacterClass | null;
  };
}

interface Group {
  id: string;
  name: string;
  members: string[]; // student_ids
}

export default function ClassroomDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classroomId } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = useSupabase();

  const [classroom, setClassroom] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [actionError, setActionError] = useState("");

  // Action loading states
  const [approvingAll, setApprovingAll] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  // Group creation
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group member assignment
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );

  const loadData = useCallback(async () => {
    const [classRes, studentsRes, groupsRes] = await Promise.all([
      supabase
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .single(),
      supabase
        .from("classroom_students")
        .select("id, student_id, status, profiles(display_name, level, total_xp, character_class)")
        .eq("classroom_id", classroomId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("classroom_groups")
        .select("id, name, classroom_group_members(student_id)")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: true }),
    ]);

    setClassroom(classRes.data);
    setStudents((studentsRes.data ?? []) as unknown as Student[]);

    const groupData = (groupsRes.data ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      members: (g.classroom_group_members ?? []).map(
        (m: any) => m.student_id
      ),
    }));
    setGroups(groupData);
    setLoading(false);
  }, [classroomId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inviteUrl =
    typeof window !== "undefined" && classroom
      ? `${window.location.origin}/join-class?token=${classroom.invite_token}`
      : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reportError = (context: string, error: { message: string } | null) => {
    if (error) {
      setActionError(`${context} : ${error.message}`);
    }
  };

  const handleUpdateStudentStatus = async (studentRowId: string, newStatus: StudentStatus) => {
    setActionError("");
    setUpdatingStatus((prev) => new Set(prev).add(studentRowId));
    const { error } = await supabase
      .from("classroom_students")
      .update({ status: newStatus })
      .eq("id", studentRowId);
    reportError("Impossible de changer le statut", error);
    await loadData();
    setUpdatingStatus((prev) => {
      const next = new Set(prev);
      next.delete(studentRowId);
      return next;
    });
  };

  const handleApproveAll = async () => {
    setActionError("");
    setApprovingAll(true);
    const pendingIds = pendingStudents.map((s) => s.id);
    if (pendingIds.length > 0) {
      const { error } = await supabase
        .from("classroom_students")
        .update({ status: "approved" })
        .in("id", pendingIds);
      reportError("Impossible d'approuver les eleves", error);
      await loadData();
    }
    setApprovingAll(false);
  };

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    setActionError("");
    setCreatingGroup(true);
    const { error } = await supabase.from("classroom_groups").insert({
      classroom_id: classroomId,
      name: trimmed,
    });
    reportError("Impossible de creer le groupe", error);
    setNewGroupName("");
    setCreatingGroup(false);
    setShowGroupModal(false);
    await loadData();
  };

  const handleDeleteGroup = async (groupId: string) => {
    setActionError("");
    const { error } = await supabase
      .from("classroom_groups")
      .delete()
      .eq("id", groupId);
    reportError("Impossible de supprimer le groupe", error);
    await loadData();
  };

  const handleRemoveStudent = async (studentRowId: string) => {
    setActionError("");
    const { error } = await supabase
      .from("classroom_students")
      .delete()
      .eq("id", studentRowId);
    reportError("Impossible de retirer l'eleve", error);
    await loadData();
  };

  const handleStartEditGroup = (group: Group) => {
    setEditingGroup(group.id);
    setSelectedStudents(new Set(group.members));
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSaveGroupMembers = async () => {
    if (!editingGroup) return;

    setActionError("");
    // Delete current members then re-insert
    const { error: deleteError } = await supabase
      .from("classroom_group_members")
      .delete()
      .eq("group_id", editingGroup);
    reportError("Impossible de modifier le groupe", deleteError);

    const inserts = Array.from(selectedStudents).map((studentId) => ({
      group_id: editingGroup,
      student_id: studentId,
    }));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("classroom_group_members")
        .insert(inserts);
      reportError("Impossible d'enregistrer les membres", insertError);
    }

    setEditingGroup(null);
    await loadData();
  };

  // Split students by status
  const pendingStudents = students.filter((s) => s.status === "pending");
  const approvedStudents = students.filter((s) => s.status === "approved");
  const rejectedStudents = students.filter((s) => s.status === "rejected");

  if (loading) return <LoadingSpinner className="mt-32" size="lg" />;
  if (!classroom) {
    return (
      <p className="mt-16 text-center text-gray-400">Classe introuvable.</p>
    );
  }

  const renderStudentCard = (s: Student, cls: ReturnType<typeof CHARACTER_CLASSES extends Record<string, infer T> ? () => T : never> | null) => (
    <div className="flex items-center gap-3">
      {cls ? (
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold",
            cls.color
          )}
        >
          {cls.icon}
        </span>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
          ?
        </span>
      )}
      <div>
        <p className="font-medium">
          {s.profiles.display_name}
        </p>
        <p className="text-xs text-gray-500">
          {cls ? cls.name : "Pas de classe"} — Niv.{" "}
          {s.profiles.level} — {s.profiles.total_xp} XP
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {actionError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/teacher/classes")}
            className="mb-2 text-sm text-indigo-500 hover:underline"
          >
            &larr; Mes Classes
          </button>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
        </div>
      </div>

      {/* Invite link */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="mb-2 text-sm font-medium text-indigo-800">
          Lien d&apos;invitation
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-700"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button onClick={handleCopyLink} size="sm">
            {copied ? "Copie !" : "Copier"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-indigo-600">
          Partagez ce lien avec vos eleves pour qu&apos;ils rejoignent la
          classe.
        </p>
      </div>

      {/* Pending students */}
      {pendingStudents.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              En attente{" "}
              <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                {pendingStudents.length}
              </span>
            </h2>
            <Button
              size="sm"
              onClick={handleApproveAll}
              isLoading={approvingAll}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              Tout approuver
            </Button>
          </div>
          <div className="space-y-2">
            {pendingStudents.map((s) => {
              const cls = s.profiles.character_class
                ? CHARACTER_CLASSES[s.profiles.character_class]
                : null;
              const isUpdating = updatingStatus.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      En attente
                    </span>
                    {renderStudentCard(s, cls)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStudentStatus(s.id, "approved")}
                      disabled={isUpdating}
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleUpdateStudentStatus(s.id, "rejected")}
                      disabled={isUpdating}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Approved students list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Eleves approuves ({approvedStudents.length})
        </h2>
        {approvedStudents.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucun eleve approuve. Partagez le lien d&apos;invitation.
          </p>
        ) : (
          <div className="space-y-2">
            {approvedStudents.map((s) => {
              const cls = s.profiles.character_class
                ? CHARACTER_CLASSES[s.profiles.character_class]
                : null;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  {renderStudentCard(s, cls)}
                  <button
                    onClick={() => handleRemoveStudent(s.id)}
                    className="text-sm text-red-400 hover:text-red-600"
                  >
                    Retirer
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Rejected students (collapsible) */}
      {rejectedStudents.length > 0 && (
        <section>
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-500 hover:text-gray-700"
          >
            <span
              className={cn(
                "inline-block transition-transform",
                showRejected ? "rotate-90" : "rotate-0"
              )}
            >
              &#9654;
            </span>
            Refuses ({rejectedStudents.length})
          </button>
          {showRejected && (
            <div className="space-y-2">
              {rejectedStudents.map((s) => {
                const cls = s.profiles.character_class
                  ? CHARACTER_CLASSES[s.profiles.character_class]
                  : null;
                const isUpdating = updatingStatus.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 opacity-60"
                  >
                    {renderStudentCard(s, cls)}
                    <button
                      onClick={() => handleUpdateStudentStatus(s.id, "approved")}
                      disabled={isUpdating}
                      className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                    >
                      Re-approuver
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Groups */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Groupes</h2>
          <Button size="sm" onClick={() => setShowGroupModal(true)}>
            Nouveau Groupe
          </Button>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun groupe cree.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{g.name}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStartEditGroup(g)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteGroup(g.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* Members display */}
                {editingGroup === g.id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Cochez les eleves a ajouter :
                    </p>
                    {approvedStudents.map((s) => (
                      <label
                        key={s.student_id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.student_id)}
                          onChange={() => handleToggleStudent(s.student_id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm">
                          {s.profiles.display_name}
                        </span>
                      </label>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSaveGroupMembers}>
                        Sauvegarder
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingGroup(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {g.members.length === 0 ? (
                      <p className="text-xs text-gray-400">Aucun membre</p>
                    ) : (
                      g.members.map((sid) => {
                        const student = students.find(
                          (s) => s.student_id === sid
                        );
                        return (
                          <span
                            key={sid}
                            className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
                          >
                            {student?.profiles.display_name ?? "Inconnu"}
                          </span>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create group modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="Nouveau Groupe"
      >
        <div className="space-y-4">
          <Input
            label="Nom du groupe"
            id="group-name"
            placeholder="Ex: Groupe A"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            autoFocus
          />
          <div className="flex gap-3">
            <Button onClick={handleCreateGroup} isLoading={creatingGroup}>
              Creer
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowGroupModal(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
