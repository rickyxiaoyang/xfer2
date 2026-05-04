import { useTauriEvent } from "./useTauriEvent";
import { useUIStore } from "@/store/uiStore";
import { api } from "@/lib/api";
import type {
  CopyCompleteEvent,
  CopyFileErrorEvent,
  CopyProgressEvent,
} from "@/types";

export function useCopyProgress() {
  const setCopyProgress = useUIStore((s) => s.setCopyProgress);
  const setCopyInProgress = useUIStore((s) => s.setCopyInProgress);
  const addCopyError = useUIStore((s) => s.addCopyError);
  const source = useUIStore((s) => s.source);
  const destination = useUIStore((s) => s.destination);
  const compareMode = useUIStore((s) => s.compareMode);
  const setScanInProgress = useUIStore((s) => s.setScanInProgress);
  const setScanProgress = useUIStore((s) => s.setScanProgress);

  useTauriEvent<CopyProgressEvent>("copy:progress", (p) => {
    setCopyProgress(p);
  });

  useTauriEvent<CopyFileErrorEvent>("copy:file-error", (e) => {
    addCopyError({ path: e.path, error: e.error });
  });

  useTauriEvent<CopyCompleteEvent>("copy:complete", (_p) => {
    setCopyInProgress(false);
    // Auto-rescan after copy to refresh isTransferred flags
    if (source && destination) {
      setScanInProgress(true);
      setScanProgress(0);
      api.scan(source, destination, compareMode).catch(() => {
        setScanInProgress(false);
      });
    }
  });
}
