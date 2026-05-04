import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileRow } from "./FileRow";
import { useUIStore } from "@/store/uiStore";
import type { FileEntry } from "@/types";

const ROW_HEIGHT = 38;

interface VirtualFileListProps {
  onVisibleFilesChange: (files: FileEntry[]) => void;
}

export function VirtualFileList({ onVisibleFilesChange }: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const files = useUIStore((s) => s.files);
  const showOnlyUntransferred = useUIStore((s) => s.showOnlyUntransferred);
  const sortField = useUIStore((s) => s.sortField);
  const sortDir = useUIStore((s) => s.sortDir);
  const filterExtensions = useUIStore((s) => s.filterExtensions);
  const filterDateAfter = useUIStore((s) => s.filterDateAfter);
  const filterDateBefore = useUIStore((s) => s.filterDateBefore);
  const toggleSelection = useUIStore((s) => s.toggleSelection);
  const selectRange = useUIStore((s) => s.selectRange);

  const sorted = useMemo(() => {
    let list = showOnlyUntransferred
      ? files.filter((f) => !f.isTransferred)
      : [...files];

    // File-type filter (comma-separated extensions, with or without leading dot)
    const exts = filterExtensions
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);
    if (exts.length > 0) {
      list = list.filter((f) => {
        const dot = f.name.lastIndexOf(".");
        if (dot < 0) return false;
        const ext = f.name.slice(dot + 1).toLowerCase();
        return exts.includes(ext);
      });
    }

    // Date filters (compare ISO strings; modified is ISO)
    if (filterDateAfter) {
      const cutoff = filterDateAfter;
      list = list.filter((f) => f.modified.slice(0, 10) >= cutoff);
    }
    if (filterDateBefore) {
      const cutoff = filterDateBefore;
      list = list.filter((f) => f.modified.slice(0, 10) <= cutoff);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "size") cmp = a.size - b.size;
      else cmp = a.modified.localeCompare(b.modified);
      return sortDir === "asc" ? cmp : -cmp;
    });

    onVisibleFilesChange(list);
    return list;
  }, [
    files,
    showOnlyUntransferred,
    filterExtensions,
    filterDateAfter,
    filterDateBefore,
    sortField,
    sortDir,
    onVisibleFilesChange,
  ]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 25,
  });

  const handleSelect = useCallback(
    (path: string, shiftKey: boolean) => {
      const selectablePaths = sorted
        .filter((f) => !f.isTransferred)
        .map((f) => f.path);
      if (shiftKey) {
        selectRange(selectablePaths, path);
      } else {
        toggleSelection(path);
      }
    },
    [sorted, selectRange, toggleSelection]
  );

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground select-none">
        Select folders and scan to see files
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground select-none">
        All files transferred
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      {/* Column headers */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border bg-background/90 backdrop-blur-sm select-none">
        <div className="w-4 shrink-0" />
        <div className="flex-1">Name</div>
        <div className="w-16 text-right shrink-0">Size</div>
        <div className="w-16 text-right shrink-0">Date</div>
        <div className="w-6 shrink-0" />
      </div>

      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vitem) => (
          <FileRow
            key={sorted[vitem.index].path}
            file={sorted[vitem.index]}
            showRelativePath
            onSelect={handleSelect}
            style={{
              position: "absolute",
              top: vitem.start,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
            }}
          />
        ))}
      </div>
    </div>
  );
}
