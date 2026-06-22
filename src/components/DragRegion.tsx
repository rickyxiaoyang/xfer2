import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ReactNode, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { isMac } from "@/lib/platform";

interface DragRegionProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Top app-bar drag region. On macOS (custom overlay titlebar) it calls
 * `startDragging()` on mousedown so the user can move the window by dragging
 * this area, and toggles maximize on double-click. On Windows the native
 * title bar already provides drag + window controls, so this renders as a
 * plain header with no window manipulation.
 *
 * Interactive children should call `e.stopPropagation()` in their own
 * mousedown handler to opt out of dragging.
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

  if (!isMac) {
    return <div className={cn(className)}>{children}</div>;
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
