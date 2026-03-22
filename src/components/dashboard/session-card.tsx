"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  session: {
    id: string;
    battle_code: string;
    expected_student_count: number;
    status: string;
    created_at: string;
  };
  bossName?: string;
}

const statusColors: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
};

export function SessionCard({ session, bossName }: SessionCardProps) {
  return (
    <Link href={`/teacher/session/${session.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{bossName ?? "Battle"}</CardTitle>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                statusColors[session.status] ?? "bg-gray-100"
              )}
            >
              {session.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span className="font-mono tracking-widest">
              {session.battle_code}
            </span>
            <span>{session.expected_student_count} students</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
