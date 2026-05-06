import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { DatedSubfolderFormat } from "./DatedSubfolderFormat";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export function SettingsPanel({ open, onClose, triggerRef }: SettingsPanelProps) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, triggerRef]);

  const panelRef = useRef<HTMLDivElement>(null);
  const showOnlyUntransferred = useUIStore((s) => s.showOnlyUntransferred);
  const setShowOnlyUntransferred = useUIStore((s) => s.setShowOnlyUntransferred);
  const datedSubfolders = useUIStore((s) => s.datedSubfolders);
  const setDatedSubfolders = useUIStore((s) => s.setDatedSubfolders);
  const filterExtensions = useUIStore((s) => s.filterExtensions);
  const setFilterExtensions = useUIStore((s) => s.setFilterExtensions);
  const filterDateAfter = useUIStore((s) => s.filterDateAfter);
  const setFilterDateAfter = useUIStore((s) => s.setFilterDateAfter);
  const filterDateBefore = useUIStore((s) => s.filterDateBefore);
  const setFilterDateBefore = useUIStore((s) => s.setFilterDateBefore);
  const resetFilters = useUIStore((s) => s.resetFilters);

  // Close on Escape (outside click handled by the backdrop below)
  useEffect(() => {
    if (!open) return;
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [open, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      {/* Invisible backdrop — absorbs hover/click on the rest of the app */}
      <div
        className="fixed inset-0 z-[100]"
        onMouseDown={onClose}
      />

      <div
        ref={panelRef}
        style={{ top: pos.top, right: pos.right }}
        className={cn(
          "fixed z-[101]",
          "w-[320px] bg-background border border-border rounded-lg shadow-xl",
          "animate-in fade-in slide-in-from-top-1 duration-150"
        )}
      >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Options
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
            title="Reset filters"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 max-h-[480px] overflow-y-auto">
        {/* Filter section */}
        <Section title="Filter">
          <ToggleField
            label="Untransferred only"
            hint="Hide files already in destination"
            checked={showOnlyUntransferred}
            onChange={setShowOnlyUntransferred}
          />

          <Field
            label="File types"
            hint="Comma-separated extensions, e.g. jpg, png, raw"
          >
            <Input
              value={filterExtensions}
              onChange={(e) => setFilterExtensions(e.target.value)}
              placeholder="jpg, png, raw"
              spellCheck={false}
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Modified after">
              <Input
                type="date"
                value={filterDateAfter ?? ""}
                onChange={(e) =>
                  setFilterDateAfter(e.target.value || null)
                }
              />
            </Field>
            <Field label="Modified before">
              <Input
                type="date"
                value={filterDateBefore ?? ""}
                onChange={(e) =>
                  setFilterDateBefore(e.target.value || null)
                }
              />
            </Field>
          </div>
        </Section>

        {/* Transfer section */}
        <Section title="Transfer">
          <ToggleField
            label="Dated subfolders"
            hint="Place each file in a subfolder named after its modified date"
            checked={datedSubfolders}
            onChange={setDatedSubfolders}
          />
          {datedSubfolders && <DatedSubfolderFormat />}
        </Section>
      </div>
      </div>
    </>,
    document.body
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground select-none">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-muted-foreground/70 select-none leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer rounded p-1 -m-1 hover:bg-accent/40 transition-colors">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 mt-0.5 cursor-pointer rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-3 w-3 mt-0.5 transform rounded-full bg-background shadow ring-0 transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground block select-none">
          {label}
        </span>
        {hint && (
          <p className="text-[10px] text-muted-foreground/70 leading-tight select-none mt-0.5">
            {hint}
          </p>
        )}
      </div>
    </label>
  );
}
