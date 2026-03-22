"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { isValidBattleCode } from "@/lib/battle/battle-code";
import { AccessibilityToggle } from "@/components/shared/accessibility-toggle";

export default function JoinBattle() {
  const router = useRouter();
  const { profile } = useAuth();
  const { joinSession } = useSession();

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    const cleanCode = code.toUpperCase().trim();
    if (!isValidBattleCode(cleanCode)) {
      setError("Invalid battle code. Must be 6 characters.");
      return;
    }

    setJoining(true);
    setError("");

    const session = await joinSession(cleanCode);

    setJoining(false);

    if (!session) {
      setError("Battle not found. Check your code and try again.");
      return;
    }

    if (session.status === "waiting") {
      router.push(`/student/lobby/${session.id}`);
    } else {
      router.push(`/student/battle/${session.id}`);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-purple-400">
          Join a Battle
        </h1>
        <p className="text-gray-400">
          Enter the 6-character code your teacher gave you.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Battle code input — large, monospaced, letter-spaced */}
      <div className="flex flex-col items-center gap-4">
        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="______"
          className="w-72 rounded-xl border-2 border-purple-600 bg-gray-900 px-6 py-4 text-center font-mono text-4xl tracking-[0.4em] text-white placeholder:text-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          aria-label="Battle code"
          autoFocus
        />
        <Button
          onClick={handleJoin}
          isLoading={joining}
          className="w-72 bg-purple-600 hover:bg-purple-700"
          size="lg"
        >
          Enter Battle
        </Button>
      </div>

      {/* Player info */}
      {profile && (
        <div className="text-center text-sm text-gray-500">
          Playing as{" "}
          <span className="font-medium text-gray-300">
            {profile.display_name}
          </span>{" "}
          — Level {profile.level}
        </div>
      )}

      <AccessibilityToggle theme="dark" className="mt-4" />
    </div>
  );
}
