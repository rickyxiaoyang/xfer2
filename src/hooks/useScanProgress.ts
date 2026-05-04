import { useTauriEvent } from "./useTauriEvent";
import { useUIStore } from "@/store/uiStore";
import type { ScanCompleteEvent, ScanProgressEvent } from "@/types";

export function useScanProgress() {
  const setScanProgress = useUIStore((s) => s.setScanProgress);
  const setScanInProgress = useUIStore((s) => s.setScanInProgress);
  const setFiles = useUIStore((s) => s.setFiles);
  const clearSelection = useUIStore((s) => s.clearSelection);

  useTauriEvent<ScanProgressEvent>("scan:progress", (p) => {
    setScanProgress(p.scanned);
  });

  useTauriEvent<ScanCompleteEvent>("scan:complete", (p) => {
    setScanInProgress(false);
    setFiles(p.files);
    clearSelection();
  });
}
