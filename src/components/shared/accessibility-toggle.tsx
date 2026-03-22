"use client";

import { useAccessibilityStore } from "@/stores/accessibility-store";
import { cn } from "@/lib/utils";

interface AccessibilityToggleProps {
  theme?: "light" | "dark";
  className?: string;
}

export function AccessibilityToggle({
  theme = "light",
  className,
}: AccessibilityToggleProps) {
  const {
    dyslexiaFont,
    highContrast,
    toggleDyslexiaFont,
    toggleHighContrast,
  } = useAccessibilityStore();

  const labelColor =
    theme === "light" ? "text-gray-700" : "text-gray-300";
  const trackOff =
    theme === "light" ? "bg-gray-300" : "bg-gray-600";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label className={cn("flex cursor-pointer items-center gap-3", labelColor)}>
        <button
          role="switch"
          aria-checked={dyslexiaFont}
          onClick={toggleDyslexiaFont}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
            dyslexiaFont ? "bg-indigo-500" : trackOff
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform",
              dyslexiaFont ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
        <span className="text-sm font-medium">Dyslexia-friendly font</span>
      </label>

      <label className={cn("flex cursor-pointer items-center gap-3", labelColor)}>
        <button
          role="switch"
          aria-checked={highContrast}
          onClick={toggleHighContrast}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
            highContrast ? "bg-indigo-500" : trackOff
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform",
              highContrast ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
        <span className="text-sm font-medium">High contrast</span>
      </label>
    </div>
  );
}
