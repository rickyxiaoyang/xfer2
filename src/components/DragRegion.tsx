import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ReactNode, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface DragRegionProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Top app-bar drag region. Calls `startDragging()` on mousedown so the user
 * can move the window by dragging this area. Interactive children should call
 * `e.stopPropagation()` in their own mousedown handler to opt out.
 */
export function DragRegion({ className, children }: DragRegionProps) {
  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.preventDefault();
    getCurrentWindow().startDragging();
  }

  function handleDoubleClick() {
    // macOS convention: double-click titlebar to maximize/restore
    getCurrentWindow()
      .toggleMaximize()
      .catch(() => {});
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
