import { useCallback, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DragRegion } from "./components/DragRegion";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { ScanProgressBanner } from "./components/ScanProgressBanner";
import { CopyProgressBar } from "./components/CopyProgressBar";
import { VirtualFileList } from "./components/VirtualFileList";
import { useScanProgress } from "./hooks/useScanProgress";
import { useCopyProgress } from "./hooks/useCopyProgress";
import type { FileEntry } from "./types";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppInner() {
  useScanProgress();
  useCopyProgress();

  const [darkMode, setDarkMode] = useState(
    () =>
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [visibleFiles, setVisibleFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleVisibleFilesChange = useCallback(
    (files: FileEntry[]) => setVisibleFiles(files),
    []
  );

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((v) => !v)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Titlebar drag region spacer for main content */}
        <DragRegion className="h-[38px] shrink-0 border-b border-border flex items-center px-4" />

        <ScanProgressBanner />
        <CopyProgressBar />

        <Toolbar visibleFiles={visibleFiles} />

        <VirtualFileList onVisibleFilesChange={handleVisibleFilesChange} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
