import { RefreshCw, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragRegion } from "./DragRegion";
import { FolderSelector } from "./FolderSelector";
import { FolderPairHistory } from "./FolderPairHistory";
import { ScanOptions } from "./ScanOptions";
import { useUIStore } from "@/store/uiStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isMac } from "@/lib/platform";

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
  const source = useUIStore((s) => s.source);
  const destination = useUIStore((s) => s.destination);
  const setSource = useUIStore((s) => s.setSource);
  const setDestination = useUIStore((s) => s.setDestination);
  const compareMode = useUIStore((s) => s.compareMode);
  const scanInProgress = useUIStore((s) => s.scanInProgress);
  const copyInProgress = useUIStore((s) => s.copyInProgress);
  const setScanInProgress = useUIStore((s) => s.setScanInProgress);
  const setScanProgress = useUIStore((s) => s.setScanProgress);
  const clearFiles = useUIStore((s) => s.clearFiles);
  const clearCopyState = useUIStore((s) => s.clearCopyState);

  const canScan = !!source && !!destination && !scanInProgress && !copyInProgress;

  async function handleScan() {
    if (!source || !destination) return;
    clearCopyState();
    clearFiles();
    setScanInProgress(true);
    setScanProgress(0);
    try {
      await api.scan(source, destination, compareMode);
    } catch {
      setScanInProgress(false);
    }
  }

  return (
    <aside className="w-[260px] shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full select-none">
      {/* Titlebar drag region. On macOS the overlay titlebar puts the traffic
          lights top-left, so we offset with pl-20 and show the app name. On
          Windows the native title bar already shows controls + title, so use
          normal padding and drop the duplicate label. */}
      <DragRegion
        className={cn(
          "h-[38px] flex items-center justify-between pr-3 shrink-0",
          isMac ? "pl-20" : "pl-3"
        )}
      >
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground/80 pointer-events-none">
          {isMac ? "xfer" : ""}
        </span>
        <button
          data-no-drag
          onClick={onToggleDark}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </DragRegion>

      <div className="flex flex-col gap-4 px-3 py-3 overflow-y-auto flex-1">
        <FolderSelector
          label="Source"
          path={source}
          onSelect={setSource}
          disabled={scanInProgress || copyInProgress}
        />
        <FolderSelector
          label="Destination"
          path={destination}
          onSelect={setDestination}
          disabled={scanInProgress || copyInProgress}
        />

        <Button
          onClick={handleScan}
          disabled={!canScan}
          className="w-full h-8 gap-1.5"
          variant={canScan ? "default" : "secondary"}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", scanInProgress && "animate-spin")}
          />
          {scanInProgress ? "Scanning…" : "Scan"}
        </Button>

        <ScanOptions />

        <div className="border-t border-sidebar-border" />

        <FolderPairHistory />
      </div>
    </aside>
  );
}
