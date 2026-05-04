import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

interface CheckboxProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className, id }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        role="checkbox"
        aria-checked={checked === "indeterminate" ? "mixed" : checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onCheckedChange?.(checked !== true);
        }}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-input bg-background shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-40",
          checked === true && "bg-primary border-primary text-primary-foreground",
          checked === "indeterminate" && "bg-primary border-primary text-primary-foreground",
          className
        )}
      >
        {checked === true && <Check className="h-3 w-3 stroke-[3]" />}
        {checked === "indeterminate" && <Minus className="h-3 w-3 stroke-[3]" />}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
