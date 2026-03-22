export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-light)", color: "var(--color-text-light)" }}>
      <header className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-indigo-600">BattleLearn — Teacher</h2>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
