import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold tracking-tight">BattleLearn</h1>
      <p className="max-w-md text-center text-lg text-gray-600">
        Transform classroom quizzes into cooperative RPG boss fights.
      </p>
      <div className="flex gap-4">
        <Link
          href="/teacher/dashboard"
          className="rounded-lg bg-indigo-500 px-6 py-3 text-white hover:bg-indigo-600"
        >
          I&apos;m a Teacher
        </Link>
        <Link
          href="/student/join"
          className="rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
        >
          I&apos;m a Student
        </Link>
      </div>
    </main>
  );
}
