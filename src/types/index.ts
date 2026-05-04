export interface FileEntry {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modified: string; // ISO-8601
  isTransferred: boolean;
}

export interface FolderPair {
  id: number;
  source: string;
  destination: string;
  lastUsed: string; // ISO-8601
  useCount: number;
}

export type CompareMode = "everywhere" | "topLevel";

export interface CopyOptions {
  datedSubfolders: boolean;
  overwriteExisting: boolean;
}

export interface ScanResult {
  files: FileEntry[];
  durationMs: number;
}

export interface CopyResult {
  succeeded: number;
  failed: number;
  durationMs: number;
  errors: CopyError[];
}

export interface CopyError {
  path: string;
  error: string;
}

// Event payloads
export interface ScanProgressEvent {
  scanned: number;
}

export interface ScanCompleteEvent {
  files: FileEntry[];
  durationMs: number;
}

export interface CopyProgressEvent {
  bytesCopied: number;
  bytesTotal: number;
  filesDone: number;
  filesTotal: number;
}

export interface CopyFileDoneEvent {
  path: string;
  index: number;
  total: number;
}

export interface CopyFileErrorEvent {
  path: string;
  error: string;
}

export interface CopyCompleteEvent {
  succeeded: number;
  failed: number;
  durationMs: number;
  errors: CopyError[];
}
