export default function BattleLobby({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Battle Lobby</h1>
      <p className="text-gray-400">Waiting for the teacher to start the battle...</p>
    </div>
  );
}
