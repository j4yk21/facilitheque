export default function BattleArena({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Battle Arena</h1>
      <p className="text-gray-400">Boss fight UI coming in Step 2.</p>
    </div>
  );
}
