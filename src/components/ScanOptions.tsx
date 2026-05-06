import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { CompareMode } from "@/types";

const modes: { value: CompareMode; label: string; summary: string; desc: string }[] = [
  {
    value: "everywhere",
    label: "Anywhere in tree",
    summary: "Anywhere",
    desc: "Considered transferred if its name appears anywhere in the destination, including subfolders.",
  },
  {
    value: "topLevel",
    label: "Top folder only",
    summary: "Top folder",
    desc: "Only check files directly inside the destination folder; ignore subfolders.",
  },
];

export function ScanOptions() {
  const [open, setOpen] = useState(false);
  const compareMode = useUIStore((s) => s.compareMode);
  const setCompareMode = useUIStore((s) => s.setCompareMode);

  const current = modes.find((m) => m.value === compareMode) ?? modes[0];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-1 py-1 text-left rounded transition-colors hover:bg-sidebar-accent/60"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-[11px] font-medium text-foreground/80">
          Scan options
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground truncate">
          {current.summary}
        </span>
      </button>

      {open && (
        <div className="pt-1.5 pl-1 space-y-1">
          <div className="space-y-1">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setCompareMode(m.value)}
                className={cn(
                  "w-full text-left rounded-md border px-2 py-1.5 transition-colors",
                  compareMode === m.value
                    ? "border-primary bg-primary/5"
                    : "border-sidebar-border hover:bg-sidebar-accent/60"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border shrink-0 flex items-center justify-center",
                      compareMode === m.value ? "border-primary" : "border-input"
                    )}
                  >
                    {compareMode === m.value && (
                      <span className="h-1 w-1 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">
                    {m.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-tight mt-0.5 ml-4">
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
