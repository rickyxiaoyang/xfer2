import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { api } from "@/lib/api";
import { formatBytes, cn, basename } from "@/lib/utils";

export function CopyProgressBar() {
  const copyInProgress = useUIStore((s) => s.copyInProgress);
  const copyProgress = useUIStore((s) => s.copyProgress);
  const copyErrors = useUIStore((s) => s.copyErrors);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  // Collapse identical error messages into one row with a count, so a single
  // root-cause (e.g. a permission-denied destination) doesn't spam N rows.
  const groupedErrors = useMemo(() => {
    const groups = new Map<
      string,
      { error: string; sampleName: string; count: number }
    >();
    for (const e of copyErrors) {
      const existing = groups.get(e.error);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(e.error, {
          error: e.error,
          sampleName: basename(e.path),
          count: 1,
        });
      }
    }
    return Array.from(groups.values());
  }, [copyErrors]);

  const showProgress = copyInProgress && copyProgress;
  const showErrors = !copyInProgress && copyErrors.length > 0;

  if (!showProgress && !showErrors) return null;

  const pct =
    copyProgress && copyProgress.bytesTotal > 0
      ? Math.round((copyProgress.bytesCopied / copyProgress.bytesTotal) * 100)
      : 0;

  return (
    <div className={cn(
      "border-b border-border text-xs",
      "animate-in slide-in-from-top-1 duration-200"
    )}>
      {showProgress && (
        <div className="px-4 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              Copying{" "}
              <span className="text-foreground font-medium">
                {copyProgress.filesDone}/{copyProgress.filesTotal}
              </span>{" "}
              files
              {copyProgress.bytesTotal > 0 && (
                <span className="ml-2">
                  {formatBytes(copyProgress.bytesCopied)} /{" "}
                  {formatBytes(copyProgress.bytesTotal)}
                </span>
              )}
            </span>
            <button
              onClick={() => api.cancelCopy()}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {showErrors && (
        <div className="px-4 py-2">
          <button
            onClick={() => setErrorsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-destructive hover:text-destructive/80 transition-colors"
          >
            {errorsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span className="font-medium">
              {copyErrors.length} copy error{copyErrors.length !== 1 ? "s" : ""}
            </span>
          </button>
          {errorsExpanded && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {groupedErrors.map((g, i) => (
                <div key={i} className="text-[10px] text-destructive/80">
                  {g.count > 1 ? (
                    <span className="font-medium">{g.count} files</span>
                  ) : (
                    <span className="font-medium">{g.sampleName}</span>
                  )}
                  <span className="text-muted-foreground ml-1">{g.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
