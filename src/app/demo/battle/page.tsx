"use client";

import { useState, useCallback } from "react";
import { IsometricScene, type PartyMember } from "@/components/battle/isometric-scene";
import { Button } from "@/components/ui/button";
import type { CharacterClass } from "@/types/database";

const DEMO_PARTY: PartyMember[] = [
  { id: "1", name: "Guerrier_01", characterClass: "warrior", state: "idle" },
  { id: "2", name: "Mage_Fire", characterClass: "mage", state: "idle" },
  { id: "3", name: "HealBot", characterClass: "healer", state: "idle" },
  { id: "4", name: "ShadowArch", characterClass: "scout", state: "idle" },
];

export default function DemoBattlePage() {
  const [party, setParty] = useState<PartyMember[]>(DEMO_PARTY);
  const [bossHp, setBossHp] = useState(300);
  const [maxBossHp] = useState(300);
  const [floatingDamages, setFloatingDamages] = useState<
    { id: string; value: number; playerName: string }[]
  >([]);
  const [attackEffects, setAttackEffects] = useState<
    { id: string; characterClass: CharacterClass; damage: number }[]
  >([]);
  const [screenShake, setScreenShake] = useState(false);

  const simulateAttack = useCallback(
    (index: number) => {
      const member = party[index];
      if (!member) return;

      const damage = Math.floor(10 + Math.random() * 20);

      // Set attack state
      setParty((prev) =>
        prev.map((m, i) =>
          i === index ? { ...m, state: "attack" as const } : m
        )
      );

      // Reset to idle after animation
      setTimeout(() => {
        setParty((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, state: "idle" as const } : m
          )
        );
      }, 700);

      // Add attack effect
      setAttackEffects((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          characterClass: member.characterClass,
          damage,
        },
      ]);

      // Add floating damage
      setFloatingDamages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          value: damage,
          playerName: member.name,
        },
      ]);

      // Reduce boss HP
      setBossHp((hp) => Math.max(0, hp - damage));

      // Screen shake
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    },
    [party]
  );

  const removeDamage = useCallback((id: string) => {
    setFloatingDamages((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removeEffect = useCallback((id: string) => {
    setAttackEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const resetBoss = () => {
    setBossHp(300);
    setParty(DEMO_PARTY);
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: "#0a0a1a", color: "white" }}
    >
      <h1 className="mb-6 text-3xl font-black text-purple-400">
        Demo - Scene de combat isometrique
      </h1>

      {/* Isometric scene */}
      <IsometricScene
        party={party}
        bossName="Le Dragon des Maths"
        currentBossHp={bossHp}
        maxBossHp={maxBossHp}
        floatingDamages={floatingDamages}
        attackEffects={attackEffects}
        onRemoveDamage={removeDamage}
        onRemoveEffect={removeEffect}
        screenShake={screenShake}
      />

      {/* Controls */}
      <div className="mt-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-300">
          Simuler les attaques :
        </h2>
        <div className="flex flex-wrap gap-3">
          {party.map((m, i) => (
            <Button
              key={m.id}
              onClick={() => simulateAttack(i)}
              className={
                m.characterClass === "warrior"
                  ? "bg-red-600 hover:bg-red-500"
                  : m.characterClass === "mage"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : m.characterClass === "healer"
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-yellow-600 hover:bg-yellow-500"
              }
            >
              {m.name} attaque !
            </Button>
          ))}
          <Button
            onClick={resetBoss}
            className="bg-gray-600 hover:bg-gray-500"
          >
            Reset Boss
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Boss HP: {bossHp} / {maxBossHp}
        </p>
      </div>
    </div>
  );
}
