import { X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ScanProgressBanner() {
  const scanInProgress = useUIStore((s) => s.scanInProgress);
  const scanScanned = useUIStore((s) => s.scanScanned);

  if (!scanInProgress) return null;

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2",
      "bg-primary/5 border-b border-border text-xs text-muted-foreground",
      "animate-in slide-in-from-top-1 duration-200"
    )}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span>
          Scanning…
          {scanScanned > 0 && (
            <span className="ml-1 font-medium text-foreground">
              {scanScanned.toLocaleString()} files found
            </span>
          )}
        </span>
      </div>
      <button
        onClick={() => api.cancelScan()}
        className="p-0.5 rounded hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
