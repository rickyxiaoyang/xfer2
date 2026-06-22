// Lightweight, dependency-free platform detection from the webview user agent.
// Computed once at module load. Used for platform-specific UI (window chrome,
// reveal-in-file-manager labels) where a boolean is all we need — avoids
// wiring the @tauri-apps/plugin-os plugin just for this.
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

export const isWindows = ua.includes("Windows");
export const isMac = ua.includes("Macintosh") || ua.includes("Mac OS");
