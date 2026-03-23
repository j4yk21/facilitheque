import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to role-appropriate page
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    redirect(profile?.role === "teacher" ? "/teacher/dashboard" : "/student/join");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="text-center">
        <h1 className="mb-3 text-6xl font-black tracking-tight text-gray-900">
          Battle<span className="text-indigo-500">Learn</span>
        </h1>
        <p className="mx-auto max-w-md text-lg text-gray-500">
          Transform classroom quizzes into cooperative RPG boss fights.
          Learn together, defeat bosses together.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-xl bg-indigo-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-xl"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-xl border-2 border-gray-200 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
        >
          Log In
        </Link>
      </div>

      <div className="grid max-w-3xl gap-8 text-center sm:grid-cols-3">
        <div>
          <div className="mb-2 text-3xl">📚</div>
          <h3 className="font-semibold text-gray-900">Teachers Create</h3>
          <p className="text-sm text-gray-500">
            Design quizzes that become boss encounters with customizable
            difficulty.
          </p>
        </div>
        <div>
          <div className="mb-2 text-3xl">⚔️</div>
          <h3 className="font-semibold text-gray-900">Students Battle</h3>
          <p className="text-sm text-gray-500">
            Answer questions to deal damage. Work together asynchronously to
            defeat bosses.
          </p>
        </div>
        <div>
          <div className="mb-2 text-3xl">♿</div>
          <h3 className="font-semibold text-gray-900">Accessible</h3>
          <p className="text-sm text-gray-500">
            Dyslexia-friendly fonts, high contrast mode, and non-punitive
            progression.
          </p>
        </div>
      </div>
    </main>
  );
}
