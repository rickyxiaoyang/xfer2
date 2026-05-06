import { Copy, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "./SettingsPanel";
import { useUIStore } from "@/store/uiStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FileEntry } from "@/types";

interface ToolbarProps {
  visibleFiles: FileEntry[];
}

type SortField = "name" | "size" | "modified";

export function Toolbar({ visibleFiles }: ToolbarProps) {
  const sortField = useUIStore((s) => s.sortField);
  const sortDir = useUIStore((s) => s.sortDir);
  const setSort = useUIStore((s) => s.setSort);
  const selectedPaths = useUIStore((s) => s.selectedPaths);
  const selectAll = useUIStore((s) => s.selectAll);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const destination = useUIStore((s) => s.destination);
  const copyInProgress = useUIStore((s) => s.copyInProgress);
  const setCopyInProgress = useUIStore((s) => s.setCopyInProgress);
  const clearCopyState = useUIStore((s) => s.clearCopyState);
  const files = useUIStore((s) => s.files);
  const datedSubfolders = useUIStore((s) => s.datedSubfolders);
  const datedSubfolderFormat = useUIStore((s) => s.datedSubfolderFormat);

  // Active filter count (for badge)
  const showOnlyUntransferred = useUIStore((s) => s.showOnlyUntransferred);
  const filterExtensions = useUIStore((s) => s.filterExtensions);
  const filterDateAfter = useUIStore((s) => s.filterDateAfter);
  const filterDateBefore = useUIStore((s) => s.filterDateBefore);
  const activeFilters =
    (showOnlyUntransferred ? 1 : 0) +
    (filterExtensions.trim() ? 1 : 0) +
    (filterDateAfter ? 1 : 0) +
    (filterDateBefore ? 1 : 0);

  const [sortOpen, setSortOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectableFiles = visibleFiles.filter((f) => !f.isTransferred);
  const selectedCount = selectedPaths.size;
  const allSelected =
    selectableFiles.length > 0 &&
    selectableFiles.every((f) => selectedPaths.has(f.path));
  const someSelected = selectedCount > 0 && !allSelected;

  function handleSelectAll(checked: boolean) {
    if (checked) selectAll(selectableFiles.map((f) => f.path));
    else clearSelection();
  }

  async function handleCopy() {
    if (!destination || selectedCount === 0) return;
    const selectedFiles = files.filter((f) => selectedPaths.has(f.path));
    clearCopyState();
    setCopyInProgress(true);
    try {
      await api.copyFiles(selectedFiles, destination, {
        datedSubfolders,
        datedSubfolderFormat,
        overwriteExisting: false,
      });
    } catch {
      setCopyInProgress(false);
    }
  }

  const sortOptions: { field: SortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "size", label: "Size" },
    { field: "modified", label: "Date" },
  ];

  const currentSort = sortOptions.find((o) => o.field === sortField);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      {/* Select all (visual button) */}
      <button
        onClick={() => handleSelectAll(!allSelected)}
        disabled={selectableFiles.length === 0}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border shadow-sm transition-colors flex items-center justify-center",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          allSelected || someSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background border-input hover:border-primary/40"
        )}
      >
        {allSelected && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {someSelected && !allSelected && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
          </svg>
        )}
      </button>

      <span className="text-xs text-muted-foreground select-none">
        {selectedCount > 0 ? (
          <span>
            <span className="font-medium text-foreground">{selectedCount}</span>{" "}
            selected
          </span>
        ) : (
          <span>{visibleFiles.length.toLocaleString()} files</span>
        )}
      </span>

      <div className="flex-1" />

      {/* Sort dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-1 rounded border border-border",
            "hover:bg-accent transition-colors text-muted-foreground"
          )}
        >
          Sort: {currentSort?.label}
          <ChevronDown className="h-3 w-3" />
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-md py-1 min-w-[100px]">
            {sortOptions.map((opt) => (
              <button
                key={opt.field}
                onClick={() => {
                  const dir =
                    sortField === opt.field && sortDir === "asc" ? "desc" : "asc";
                  setSort(opt.field, dir);
                  setSortOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-accent transition-colors",
                  sortField === opt.field && "text-primary font-medium"
                )}
              >
                {opt.label}
                {sortField === opt.field && (
                  <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options button (consolidated settings) */}
      <button
        ref={settingsBtnRef}
        onClick={() => setSettingsOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors",
          settingsOpen || activeFilters > 0
            ? "border-primary/40 bg-primary/5 text-foreground"
            : "border-border text-muted-foreground hover:bg-accent"
        )}
      >
        <SlidersHorizontal className="h-3 w-3" />
        Options
        {activeFilters > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {activeFilters}
          </span>
        )}
      </button>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        triggerRef={settingsBtnRef}
      />

      {/* Copy button */}
      <Button
        onClick={handleCopy}
        disabled={selectedCount === 0 || !destination || copyInProgress}
        size="sm"
        className="gap-1.5 h-7"
      >
        <Copy className="h-3.5 w-3.5" />
        {copyInProgress
          ? "Copying…"
          : selectedCount > 0
          ? `Copy ${selectedCount}`
          : "Copy"}
      </Button>
    </div>
  );
}
