use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub relative_path: String,
    pub size: u64,
    pub modified: DateTime<Utc>,
    pub is_transferred: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPair {
    pub id: i64,
    pub source: String,
    pub destination: String,
    pub last_used: DateTime<Utc>,
    pub use_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CompareMode {
    /// Walk the destination tree recursively; a source file is considered
    /// transferred if its filename appears anywhere in the destination.
    Everywhere,
    /// Only look at files directly inside the destination folder
    /// (no subfolder recursion).
    TopLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyOptions {
    pub dated_subfolders: bool,
    pub overwrite_existing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub files: Vec<FileEntry>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyResult {
    pub succeeded: u64,
    pub failed: u64,
    pub duration_ms: u64,
    pub errors: Vec<CopyError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyError {
    pub path: String,
    pub error: String,
}

// Event payloads

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressPayload {
    pub scanned: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanCompletePayload {
    pub files: Vec<FileEntry>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyProgressPayload {
    pub bytes_copied: u64,
    pub bytes_total: u64,
    pub files_done: u64,
    pub files_total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyFileDonePayload {
    pub path: String,
    pub index: u64,
    pub total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyFileErrorPayload {
    pub path: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyCompletePayload {
    pub succeeded: u64,
    pub failed: u64,
    pub duration_ms: u64,
    pub errors: Vec<CopyError>,
}
