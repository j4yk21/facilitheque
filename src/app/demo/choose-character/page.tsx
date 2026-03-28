"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_CLASSES, type CharacterClassDef } from "@/lib/rpg/character-classes";
import { CharacterSprite } from "@/components/rpg/sprites/character-sprite";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CharacterClass } from "@/types/database";

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
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
        isSelected
          ? "border-purple-500 bg-purple-900/40 shadow-xl shadow-purple-500/30"
          : "border-gray-700 bg-gray-900/60 hover:border-gray-500 hover:bg-gray-900/80"
      )}
    >
      {isSelected && (
        <motion.div
          layoutId="selected-ring"
          className="absolute -inset-1 rounded-2xl border-2 border-purple-400"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      <div className="relative h-32 w-32">
        <CharacterSprite
          characterClass={cls.id}
          size={128}
          state={isSelected ? "victory" : "idle"}
          direction="right"
        />
      </div>

      <h3 className={cn("text-xl font-bold", cls.color)}>{cls.name}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{cls.description}</p>

      <div className="mt-2 w-full space-y-1.5 text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5">
          <span className="text-purple-300">&#9876;</span>
          <span className="text-purple-300">{cls.individualBonus}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5">
          <span className="text-cyan-300">&#129309;</span>
          <span className="text-cyan-300">{cls.teamBonus}</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function DemoChooseCharacterPage() {
  const [selected, setSelected] = useState<CharacterClass | null>(null);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-8"
      style={{ background: "#0a0a1a", color: "white" }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          Choisis ton personnage
        </h1>
        <p className="text-gray-400 text-lg">
          Chaque classe a des bonus uniques en combat. Choisis bien !
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {ALL_CLASSES.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <ClassCard
              cls={cls}
              isSelected={selected === cls.id}
              onClick={() => setSelected(cls.id)}
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-4">
              <CharacterSprite
                characterClass={selected}
                size={80}
                state="idle"
                direction="right"
              />
              <div>
                <p className="text-lg font-bold text-white">
                  {ALL_CLASSES.find((c) => c.id === selected)?.name}
                </p>
                <p className="text-sm text-gray-400">
                  Pret pour le combat !
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-purple-600 px-12 text-lg font-bold hover:bg-purple-500"
              onClick={() => alert("Personnage confirme ! (demo)")}
            >
              Confirmer mon choix
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
