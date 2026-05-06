import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

interface Preset {
  label: string;
  format: string;
}

const PRESETS: Preset[] = [
  { label: "MM-DD-YYYY", format: "{month}-{day}-{year}" },
  { label: "YYYY-MM-DD", format: "{year}-{month}-{day}" },
  { label: "YYYY/MM/DD", format: "{year}/{month}/{day}" },
  { label: "YYYY-MM", format: "{year}-{month}" },
];

const VARIABLES: { token: string; meaning: string; example: string }[] = [
  { token: "{year}", meaning: "4-digit year", example: "2026" },
  { token: "{yy}", meaning: "2-digit year", example: "26" },
  { token: "{month}", meaning: "Zero-padded month", example: "05" },
  { token: "{month_name}", meaning: "Full month name", example: "May" },
  { token: "{month_short}", meaning: "Abbreviated month", example: "May" },
  { token: "{day}", meaning: "Zero-padded day", example: "06" },
  { token: "{weekday}", meaning: "Full weekday", example: "Wednesday" },
  { token: "{weekday_short}", meaning: "Abbreviated weekday", example: "Wed" },
];

const ILLEGAL_PATH_CHARS = /[<>:"\\|?*]/g;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderPreview(format: string, now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const weekday = now.getDay();
  const replacements: Record<string, string> = {
    "{year}": String(year),
    "{yy}": String(year % 100).padStart(2, "0"),
    "{month}": pad2(month + 1),
    "{month_name}": MONTHS_FULL[month],
    "{month_short}": MONTHS_SHORT[month],
    "{day}": pad2(day),
    "{weekday}": WEEKDAYS_FULL[weekday],
    "{weekday_short}": WEEKDAYS_SHORT[weekday],
  };
  let out = format;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  return out.replace(ILLEGAL_PATH_CHARS, "");
}

function isPreset(format: string): boolean {
  return PRESETS.some((p) => p.format === format);
}

export function DatedSubfolderFormat() {
  const datedSubfolderFormat = useUIStore((s) => s.datedSubfolderFormat);
  const setDatedSubfolderFormat = useUIStore((s) => s.setDatedSubfolderFormat);

  const [customMode, setCustomMode] = useState(() => !isPreset(datedSubfolderFormat));
  const [customDraft, setCustomDraft] = useState(() =>
    isPreset(datedSubfolderFormat) ? "" : datedSubfolderFormat
  );

  const now = new Date();

  function selectPreset(format: string) {
    setCustomMode(false);
    setDatedSubfolderFormat(format);
  }

  function selectCustom() {
    setCustomMode(true);
    const draft = customDraft || datedSubfolderFormat;
    setCustomDraft(draft);
    if (draft.trim()) {
      setDatedSubfolderFormat(draft);
    }
  }

  function onCustomChange(v: string) {
    setCustomDraft(v);
    if (v.trim()) {
      setDatedSubfolderFormat(v);
    }
  }

  const activeFormat = customMode ? customDraft : datedSubfolderFormat;
  const preview = activeFormat.trim() ? renderPreview(activeFormat, now) : "";

  return (
    <div className="space-y-1.5 pl-7">
      <div className="flex items-center gap-1">
        <label className="text-[11px] font-medium text-foreground select-none">
          Format
        </label>
        <VariablesHelp />
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => {
          const selected = !customMode && datedSubfolderFormat === p.format;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => selectPreset(p.format)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded border transition-colors font-mono",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={selectCustom}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded border transition-colors",
            customMode
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Custom
        </button>
      </div>

      {customMode && (
        <Input
          value={customDraft}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="{year}-{month}-{day}"
          spellCheck={false}
          autoComplete="off"
          className="font-mono text-[11px] h-7"
        />
      )}

      {preview ? (
        <p className="text-[10px] text-muted-foreground/80 leading-tight">
          Preview: <span className="font-mono text-foreground/90">{preview}</span>
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground/60 leading-tight">
          Type a format using variables like <span className="font-mono">{"{year}"}</span>.
        </p>
      )}
    </div>
  );
}

function VariablesHelp() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="p-0.5 rounded text-muted-foreground/70 hover:text-foreground transition-colors"
        aria-label="Show available variables"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {open && pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[200]"
              onMouseDown={() => setOpen(false)}
            />
            <div
              style={{ top: pos.top, left: pos.left }}
              className={cn(
                "fixed z-[201] w-[260px] bg-background border border-border rounded-lg shadow-xl p-2.5",
                "animate-in fade-in slide-in-from-top-1 duration-150"
              )}
              onMouseLeave={() => setOpen(false)}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Variables
              </p>
              <div className="space-y-1">
                {VARIABLES.map((v) => (
                  <div
                    key={v.token}
                    className="grid grid-cols-[auto_1fr_auto] gap-2 items-baseline text-[10px] leading-tight"
                  >
                    <span className="font-mono text-foreground">{v.token}</span>
                    <span className="text-muted-foreground/80">{v.meaning}</span>
                    <span className="font-mono text-muted-foreground/60">{v.example}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2 pt-2 border-t border-border leading-tight">
                Use <span className="font-mono">/</span> for nested folders. Other path-illegal characters are stripped.
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
