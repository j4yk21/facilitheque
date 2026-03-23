import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-6xl font-black text-gray-300">404</h1>
      <p className="text-lg text-gray-500">
        This page doesn&apos;t exist. The boss must have destroyed it.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-500 px-6 py-3 text-white hover:bg-indigo-600"
      >
        Return Home
      </Link>
    </main>
  );
}
