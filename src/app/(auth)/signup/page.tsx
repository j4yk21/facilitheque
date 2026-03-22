"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return setError("Display name is required");

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          role,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (role === "teacher") {
      router.push("/teacher/dashboard");
    } else {
      router.push("/student/join");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form
        onSubmit={handleSignUp}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join BattleLearn</h1>
          <p className="mt-1 text-gray-500">Create your account and choose your role.</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Role picker */}
        <div>
          <label className="mb-2 block text-sm font-medium">I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            {(["teacher", "student"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg border-2 px-4 py-3 text-center font-medium capitalize transition-colors",
                  role === r
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                {r === "teacher" ? "📚 Teacher" : "⚔️ Student"}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Display Name"
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={role === "teacher" ? "Mr. Smith" : "DragonSlayer42"}
          required
        />

        <Input
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          required
        />

        <Input
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          required
        />

        <Button type="submit" isLoading={loading} className="w-full">
          Create Account
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-500 hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </main>
  );
}
