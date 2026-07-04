"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import Link from "next/link";

function JoinClassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { profile, isLoading: authLoading } = useAuth();
  const supabase = useSupabase();

  const [status, setStatus] = useState<
    "loading" | "no-token" | "not-logged-in" | "joining" | "joined" | "error" | "already"
  >("loading");
  const [classroomName, setClassroomName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    if (authLoading) return;

    if (!profile) {
      setStatus("not-logged-in");
      return;
    }

    async function joinClass() {
      setStatus("joining");

      // Find classroom by token (RPC: tokens are no longer enumerable
      // through a public SELECT policy)
      const { data: classrooms, error: rpcError } = await supabase.rpc(
        "get_classroom_by_token",
        { p_token: token! }
      );
      let classroom = classrooms?.[0];

      if (
        !classroom &&
        (rpcError?.code === "PGRST202" || rpcError?.code === "42883")
      ) {
        // Migration 00005 not applied yet (RPC missing): fall back to the
        // direct lookup the old policy allows. Remove once 00005 is deployed.
        const { data: legacy } = await supabase
          .from("classrooms")
          .select("id, name")
          .eq("invite_token", token!)
          .single();
        classroom = legacy ?? undefined;
      }

      if (!classroom) {
        setError("Lien d'invitation invalide ou expire.");
        setStatus("error");
        return;
      }

      setClassroomName(classroom.name);

      // Try to join
      const { error: joinError } = await supabase
        .from("classroom_students")
        .insert({
          classroom_id: classroom.id,
          student_id: profile!.id,
        });

      if (joinError) {
        if (joinError.code === "23505") {
          // Already a member
          setStatus("already");
          return;
        }
        setError("Erreur lors de l'inscription. Reessayez.");
        setStatus("error");
        return;
      }

      setStatus("joined");
    }

    joinClass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profile, authLoading]);

  if (status === "loading" || authLoading) {
    return <LoadingSpinner className="mt-32" size="lg" />;
  }

  if (status === "no-token") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Lien invalide</h1>
        <p className="text-gray-500">
          Ce lien ne contient pas de token d&apos;invitation.
        </p>
      </div>
    );
  }

  if (status === "not-logged-in") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Connexion requise</h1>
        <p className="text-gray-500">
          Connecte-toi pour rejoindre la classe.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/join-class?token=${token}`)}`}
        >
          <Button>Se connecter</Button>
        </Link>
      </div>
    );
  }

  if (status === "joining") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500">Inscription en cours...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Erreur</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  // joined or already
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {status === "already" ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-600">
            &#10003;
          </div>
          <h1 className="text-2xl font-bold">Deja inscrit !</h1>
          <p className="text-gray-500">
            Tu fais deja partie de la classe &ldquo;{classroomName}&rdquo;.
          </p>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600">
            &#9203;
          </div>
          <h1 className="text-2xl font-bold">Demande envoyee !</h1>
          <p className="text-gray-500">
            Ton professeur doit approuver ton inscription a la classe
            &ldquo;{classroomName}&rdquo;.
          </p>
        </>
      )}
      <Link href="/student/dashboard">
        <Button>Aller a mon dashboard</Button>
      </Link>
    </div>
  );
}

export default function JoinClassPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="mt-32" size="lg" />}>
      <JoinClassContent />
    </Suspense>
  );
}
