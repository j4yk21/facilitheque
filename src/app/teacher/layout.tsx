import Link from "next/link";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-light)", color: "var(--color-text-light)" }}>
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/teacher/dashboard">
            <h2 className="text-xl font-semibold text-indigo-600">BattleLearn</h2>
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/teacher/dashboard" className="text-gray-600 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/teacher/classes" className="text-gray-600 hover:text-indigo-600">
              Mes Classes
            </Link>
            <Link href="/teacher/templates/new" className="text-gray-600 hover:text-indigo-600">
              Templates
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
