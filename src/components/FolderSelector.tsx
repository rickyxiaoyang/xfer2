import { useState } from "react";
import { Folder, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, basename } from "@/lib/utils";

interface FolderSelectorProps {
  label: string;
  path: string | null;
  onSelect: (path: string) => void;
  disabled?: boolean;
}

export function FolderSelector({
  label,
  path,
  onSelect,
  disabled,
}: FolderSelectorProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await api.pickFolder(`Select ${label}`);
      if (result) onSelect(result);
    } catch {
      // user cancelled or error — silently ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
        {label}
      </p>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
          "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "border border-transparent",
          path && "border-border/60"
        )}
      >
        <span className="shrink-0 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Folder className="h-3.5 w-3.5" />
          )}
        </span>
        {path ? (
          <span className="truncate text-xs font-medium">{basename(path)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Click to select…
          </span>
        )}
      </button>
      {path && (
        <p
          className="text-[10px] text-muted-foreground/70 truncate px-2.5 select-none"
          title={path}
        >
          {path}
        </p>
      )}
    </div>
  );
}
