import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CompareMode, CopyError, CopyProgressEvent, FileEntry } from "@/types";

type SortField = "name" | "size" | "modified";
type SortDir = "asc" | "desc";

interface UIStore {
  // Folder paths
  source: string | null;
  destination: string | null;
  setSource: (p: string | null) => void;
  setDestination: (p: string | null) => void;

  // Config
  compareMode: CompareMode;
  setCompareMode: (m: CompareMode) => void;
  showOnlyUntransferred: boolean;
  setShowOnlyUntransferred: (v: boolean) => void;
  datedSubfolders: boolean;
  setDatedSubfolders: (v: boolean) => void;
  datedSubfolderFormat: string;
  setDatedSubfolderFormat: (v: string) => void;

  // Filters
  filterExtensions: string;          // raw input string e.g. "jpg, png, raw"
  setFilterExtensions: (v: string) => void;
  filterDateAfter: string | null;    // YYYY-MM-DD
  setFilterDateAfter: (v: string | null) => void;
  filterDateBefore: string | null;   // YYYY-MM-DD
  setFilterDateBefore: (v: string | null) => void;
  resetFilters: () => void;

  // Sorting
  sortField: SortField;
  sortDir: SortDir;
  setSort: (field: SortField, dir: SortDir) => void;

  // File selection
  selectedPaths: Set<string>;
  lastAnchor: string | null;
  toggleSelection: (path: string) => void;
  selectRange: (orderedPaths: string[], to: string) => void;
  selectAll: (paths: string[]) => void;
  clearSelection: () => void;
  isSelected: (path: string) => boolean;

  // Scan state
  scanInProgress: boolean;
  scanScanned: number;
  setScanInProgress: (v: boolean) => void;
  setScanProgress: (scanned: number) => void;

  // Copy state
  copyInProgress: boolean;
  copyProgress: CopyProgressEvent | null;
  copyErrors: CopyError[];
  setCopyInProgress: (v: boolean) => void;
  setCopyProgress: (p: CopyProgressEvent) => void;
  addCopyError: (e: CopyError) => void;
  clearCopyState: () => void;

  // File list (set from scan:complete event)
  files: FileEntry[];
  setFiles: (files: FileEntry[]) => void;
  clearFiles: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      source: null,
      destination: null,
      setSource: (p) => set({ source: p }),
      setDestination: (p) => set({ destination: p }),

      compareMode: "everywhere",
      setCompareMode: (m) => set({ compareMode: m }),
      showOnlyUntransferred: true,
      setShowOnlyUntransferred: (v) => set({ showOnlyUntransferred: v }),
      datedSubfolders: false,
      setDatedSubfolders: (v) => set({ datedSubfolders: v }),
      datedSubfolderFormat: "{month}-{day}-{year}",
      setDatedSubfolderFormat: (v) => set({ datedSubfolderFormat: v }),

      filterExtensions: "",
      setFilterExtensions: (v) => set({ filterExtensions: v }),
      filterDateAfter: null,
      setFilterDateAfter: (v) => set({ filterDateAfter: v }),
      filterDateBefore: null,
      setFilterDateBefore: (v) => set({ filterDateBefore: v }),
      resetFilters: () =>
        set({
          filterExtensions: "",
          filterDateAfter: null,
          filterDateBefore: null,
          showOnlyUntransferred: true,
        }),

      sortField: "name",
      sortDir: "asc",
      setSort: (field, dir) => set({ sortField: field, sortDir: dir }),

      selectedPaths: new Set(),
      lastAnchor: null,
      toggleSelection: (path) => {
        const next = new Set(get().selectedPaths);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        set({ selectedPaths: next, lastAnchor: path });
      },
      selectRange: (orderedPaths, to) => {
        const { lastAnchor, selectedPaths } = get();
        const anchor = lastAnchor ?? to;
        const fromIdx = orderedPaths.indexOf(anchor);
        const toIdx = orderedPaths.indexOf(to);
        if (toIdx === -1) return;
        const [start, end] =
          fromIdx === -1 || fromIdx > toIdx
            ? [toIdx, fromIdx === -1 ? toIdx : fromIdx]
            : [fromIdx, toIdx];
        const next = new Set(selectedPaths);
        for (let i = start; i <= end; i++) next.add(orderedPaths[i]);
        set({ selectedPaths: next, lastAnchor: to });
      },
      selectAll: (paths) =>
        set({ selectedPaths: new Set(paths), lastAnchor: null }),
      clearSelection: () => set({ selectedPaths: new Set(), lastAnchor: null }),
      isSelected: (path) => get().selectedPaths.has(path),

      scanInProgress: false,
      scanScanned: 0,
      setScanInProgress: (v) => set({ scanInProgress: v }),
      setScanProgress: (scanned) => set({ scanScanned: scanned }),

      copyInProgress: false,
      copyProgress: null,
      copyErrors: [],
      setCopyInProgress: (v) => set({ copyInProgress: v }),
      setCopyProgress: (p) => set({ copyProgress: p }),
      addCopyError: (e) =>
        set((s) => ({ copyErrors: [...s.copyErrors, e] })),
      clearCopyState: () =>
        set({ copyInProgress: false, copyProgress: null, copyErrors: [] }),

      files: [],
      setFiles: (files) => set({ files }),
      clearFiles: () => set({ files: [] }),
    }),
    {
      name: "xfer-ui",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Only persist stable settings — not transient state, selections, or
      // the file list. Selected paths and scan results are session-scoped.
      partialize: (state) => ({
        source: state.source,
        destination: state.destination,
        compareMode: state.compareMode,
        showOnlyUntransferred: state.showOnlyUntransferred,
        datedSubfolders: state.datedSubfolders,
        datedSubfolderFormat: state.datedSubfolderFormat,
        filterExtensions: state.filterExtensions,
        filterDateAfter: state.filterDateAfter,
        filterDateBefore: state.filterDateBefore,
        sortField: state.sortField,
        sortDir: state.sortDir,
      }),
    }
  )
);
