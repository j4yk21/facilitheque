"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-gray-800">Something went wrong</h1>
      <p className="max-w-md text-center text-gray-500">
        An unexpected error occurred. The boss fight hit a snag.
      </p>
      <Button onClick={reset}>Try Again</Button>
    </main>
  );
}
