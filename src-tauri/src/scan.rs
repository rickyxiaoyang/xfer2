use anyhow::Result;
use chrono::{DateTime, TimeZone, Utc};
use jwalk::WalkDir;
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use crate::types::{CompareMode, FileEntry, ScanCompletePayload, ScanProgressPayload};

fn relative_to(path: &Path, base: &Path) -> String {
    path.strip_prefix(base)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| {
            path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default()
        })
}

fn is_hidden_or_skip(name: &str, is_dir: bool) -> bool {
    if name.starts_with('.') {
        return true;
    }
    if is_dir && (name.ends_with(".app") || name.ends_with(".bundle")) {
        return true;
    }
    false
}

/// Recursively walks the tree and returns a set of filenames found in any
/// file (including subfolders).
fn collect_names_recursive(root: &Path) -> HashSet<String> {
    let mut set = HashSet::new();
    for result in WalkDir::new(root) {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let file_type = entry.file_type;
        if is_hidden_or_skip(&name, file_type.is_dir())
            || file_type.is_dir()
            || file_type.is_symlink()
        {
            continue;
        }

        set.insert(name);
    }
    set
}

/// Non-recursive: only filenames directly inside `root`.
fn collect_names_top_level(root: &Path) -> HashSet<String> {
    let mut set = HashSet::new();
    let read = match std::fs::read_dir(root) {
        Ok(r) => r,
        Err(_) => return set,
    };
    for entry in read.flatten() {
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if file_type.is_dir() || file_type.is_symlink() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if is_hidden_or_skip(&name, false) {
            continue;
        }
        set.insert(name);
    }
    set
}

pub async fn scan_folders(
    app: AppHandle,
    source: PathBuf,
    destination: PathBuf,
    mode: CompareMode,
    cancelled: Arc<Mutex<Arc<AtomicBool>>>,
) -> Result<Vec<FileEntry>> {
    let start = Instant::now();

    let dest_root = destination.clone();
    let mode_for_dest = mode.clone();

    // Build destination key set (filenames). All comparison modes key by
    // filename — they differ only in *where* in the destination we look.
    let dest_keys = tokio::task::spawn_blocking(move || match mode_for_dest {
        CompareMode::Everywhere => collect_names_recursive(&dest_root),
        CompareMode::TopLevel => collect_names_top_level(&dest_root),
    })
    .await?;

    let cancel_flag = {
        let guard = cancelled.lock().await;
        guard.clone()
    };

    let src_root = source.clone();
    let app_clone = app.clone();

    let files = tokio::task::spawn_blocking(move || {
        let mut files: Vec<FileEntry> = Vec::new();
        let mut count: u64 = 0;

        for result in WalkDir::new(&src_root) {
            if cancel_flag.load(Ordering::Relaxed) {
                break;
            }

            let entry = match result {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let file_type = entry.file_type;
            if is_hidden_or_skip(&name, file_type.is_dir()) || file_type.is_dir() || file_type.is_symlink() {
                continue;
            }

            // mode only affects how the destination set was built; the
            // comparison key on the source side is always the filename.
            let _ = mode;
            let relative = relative_to(&path, &src_root);
            let key = name.clone();

            let metadata = match std::fs::metadata(&path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let modified: DateTime<Utc> = metadata
                .modified()
                .ok()
                .and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| {
                        Utc.timestamp_opt(d.as_secs() as i64, d.subsec_nanos())
                            .single()
                            .unwrap_or_else(Utc::now)
                    })
                })
                .unwrap_or_else(Utc::now);

            files.push(FileEntry {
                path: path.to_string_lossy().to_string(),
                name,
                relative_path: relative,
                size: metadata.len(),
                modified,
                is_transferred: dest_keys.contains(&key),
            });

            count += 1;
            if count % 100 == 0 {
                let _ = app_clone.emit("scan:progress", ScanProgressPayload { scanned: count });
            }
        }

        files
    })
    .await?;

    let duration_ms = start.elapsed().as_millis() as u64;

    app.emit(
        "scan:complete",
        ScanCompletePayload {
            files: files.clone(),
            duration_ms,
        },
    )?;

    Ok(files)
}
