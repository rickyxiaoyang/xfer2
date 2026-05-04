import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useUIStore } from "@/store/uiStore";
import { formatRelativeTime, basename } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FolderPair } from "@/types";

export function FolderPairHistory() {
  const queryClient = useQueryClient();
  const setSource = useUIStore((s) => s.setSource);
  const setDestination = useUIStore((s) => s.setDestination);

  const { data: pairs = [] } = useQuery({
    queryKey: ["folderPairs"],
    queryFn: api.listFolderPairs,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteFolderPair(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["folderPairs"] }),
  });

  if (pairs.length === 0) return null;

  function loadPair(pair: FolderPair) {
    setSource(pair.source);
    setDestination(pair.destination);
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none px-1">
        Recent
      </p>
      <div className="space-y-0.5">
        {pairs.map((pair) => (
          <div
            key={pair.id}
            className={cn(
              "group flex items-center gap-1 rounded-md px-2 py-1.5",
              "hover:bg-sidebar-accent transition-colors cursor-pointer"
            )}
            onClick={() => loadPair(pair)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs">
                <span className="truncate font-medium text-sidebar-foreground max-w-[70px]">
                  {basename(pair.source)}
                </span>
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground max-w-[70px]">
                  {basename(pair.destination)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                {pair.useCount}× · {formatRelativeTime(pair.lastUsed)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(pair.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
