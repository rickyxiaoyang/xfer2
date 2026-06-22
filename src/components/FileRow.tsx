import { Check, FolderOpen } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import { isWindows } from "@/lib/platform";
import type { FileEntry } from "@/types";
import type { CSSProperties, MouseEvent } from "react";

interface FileRowProps {
  file: FileEntry;
  style?: CSSProperties;
  showRelativePath?: boolean;
  onSelect: (path: string, shiftKey: boolean) => void;
}

export function FileRow({ file, style, showRelativePath, onSelect }: FileRowProps) {
  const isSelected = useUIStore((s) => s.isSelected(file.path));
  const copyInProgress = useUIStore((s) => s.copyInProgress);

  const interactive = !file.isTransferred && !copyInProgress;

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-no-row-click]")) return;
    // Prevent text-selection drag from shift-click
    if (e.shiftKey) e.preventDefault();
    onSelect(file.path, e.shiftKey);
  }

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      className={cn(
        "group flex items-center gap-2.5 px-4 text-xs border-b border-border/40",
        "transition-colors select-none cursor-default",
        file.isTransferred
          ? "text-muted-foreground/60 bg-transparent"
          : isSelected
          ? "bg-primary/5 text-foreground"
          : "hover:bg-accent/40 text-foreground"
      )}
    >
      {/* Checkbox / check icon (visual only — clicks handled by row) */}
      <div className="shrink-0 w-4 flex items-center justify-center pointer-events-none">
        {file.isTransferred ? (
          <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
        ) : (
          <div
            className={cn(
              "h-4 w-4 rounded-sm border shadow-sm transition-colors flex items-center justify-center",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background border-input"
            )}
          >
            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
        )}
      </div>

      {/* Name + path */}
      <div className="flex-1 min-w-0">
        <span
          className={cn("truncate block", file.isTransferred && "line-through")}
          title={file.path}
        >
          {file.name}
        </span>
        {showRelativePath && file.relativePath !== file.name && (
          <span className="block text-[10px] text-muted-foreground/50 truncate">
            {file.relativePath}
          </span>
        )}
      </div>

      {/* Size */}
      <span className="shrink-0 w-16 text-right text-muted-foreground/70 tabular-nums">
        {formatBytes(file.size)}
      </span>

      {/* Date */}
      <span className="shrink-0 w-16 text-right text-muted-foreground/70">
        {formatDate(file.modified)}
      </span>

      {/* Show in Finder button */}
      {!file.isTransferred ? (
        <div
          data-no-row-click
          className="shrink-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Tooltip content={isWindows ? "Show in Explorer" : "Show in Finder"}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                api.showInFinder(file.path);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 rounded hover:text-primary transition-colors text-muted-foreground"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ) : (
        <div className="shrink-0 w-6" />
      )}
    </div>
  );
}
