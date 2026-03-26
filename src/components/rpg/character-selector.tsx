"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ALL_CLASSES, type CharacterClassDef } from "@/lib/rpg/character-classes";
import type { CharacterClass } from "@/types/database";
import { Button } from "@/components/ui/button";

interface CharacterSelectorProps {
  currentClass: CharacterClass | null;
  onSelect: (cls: CharacterClass) => Promise<void> | void;
  className?: string;
}

function ClassCard({
  cls,
  isSelected,
  onClick,
}: {
  cls: CharacterClassDef;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02]",
        isSelected
          ? "border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-500/20"
          : "border-gray-700 bg-gray-900/60 hover:border-gray-500"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-xl font-bold",
            cls.color
          )}
        >
          {cls.icon}
        </span>
        <div>
          <h3 className="font-semibold text-white">{cls.name}</h3>
        </div>
      </div>
      <p className="text-sm text-gray-400">{cls.description}</p>
      <div className="mt-1 space-y-1 text-xs">
        <p className="text-purple-300">Individuel: {cls.individualBonus}</p>
        <p className="text-cyan-300">Equipe: {cls.teamBonus}</p>
      </div>
    </button>
  );
}

export function CharacterSelector({
  currentClass,
  onSelect,
  className,
}: CharacterSelectorProps) {
  const [selected, setSelected] = useState<CharacterClass | null>(
    currentClass
  );
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    await onSelect(selected);
    setSaving(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold text-white">
        Choisis ta classe
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_CLASSES.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            isSelected={selected === cls.id}
            onClick={() => setSelected(cls.id)}
          />
        ))}
      </div>
      {selected && selected !== currentClass && (
        <Button
          onClick={handleConfirm}
          isLoading={saving}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Confirmer: {ALL_CLASSES.find((c) => c.id === selected)?.name}
        </Button>
      )}
    </div>
  );
}
