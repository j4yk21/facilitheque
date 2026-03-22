export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-dark)", color: "var(--color-text-dark)" }}>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
