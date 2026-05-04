import { invoke } from "@tauri-apps/api/core";
import type {
  CompareMode,
  CopyOptions,
  CopyResult,
  FileEntry,
  FolderPair,
  ScanResult,
} from "@/types";

export const api = {
  pickFolder: (title: string) =>
    invoke<string | null>("pick_folder", { title }),

  listFolderPairs: () => invoke<FolderPair[]>("list_folder_pairs"),

  deleteFolderPair: (id: number) =>
    invoke<void>("delete_folder_pair", { id }),

  scan: (source: string, destination: string, mode: CompareMode) =>
    invoke<ScanResult>("scan", { source, destination, mode }),

  copyFiles: (
    files: FileEntry[],
    destination: string,
    options: CopyOptions
  ) => invoke<CopyResult>("copy_files", { files, destination, options }),

  showInFinder: (path: string) => invoke<void>("show_in_finder", { path }),

  cancelScan: () => invoke<void>("cancel_scan"),

  cancelCopy: () => invoke<void>("cancel_copy"),
};
