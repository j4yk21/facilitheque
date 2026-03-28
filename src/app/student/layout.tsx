"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isLoading } = useAuth();

  // Redirect to character selection if no character chosen
  useEffect(() => {
    if (isLoading) return;
    if (!profile) return;
    if (profile.role !== "student") return;

    const isOnChoosePage = pathname === "/student/choose-character";

    if (!profile.character_class && !isOnChoosePage) {
      router.push("/student/choose-character");
    }
  }, [profile, isLoading, pathname, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-dark)", color: "var(--color-text-dark)" }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-dark)", color: "var(--color-text-dark)" }}>
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/student/dashboard">
            <h2 className="text-xl font-semibold text-purple-400">BattleLearn</h2>
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/student/dashboard" className="text-gray-400 hover:text-purple-400">
              Dashboard
            </Link>
            <Link href="/student/join" className="text-gray-400 hover:text-purple-400">
              Rejoindre
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
