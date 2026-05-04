use anyhow::Result;
use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc,
    },
    time::Instant,
};
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex, Semaphore};

use crate::types::{
    CopyCompletePayload, CopyError, CopyFileDonePayload, CopyFileErrorPayload, CopyOptions,
    CopyProgressPayload, CopyResult, FileEntry,
};

/// Files larger than this get a background size-watcher for live progress.
/// Smaller files complete fast enough that per-byte progress isn't worth the overhead.
const SIZE_WATCH_THRESHOLD: u64 = 64 * 1024 * 1024; // 64 MiB

/// macOS-native copy via `copyfile(3)`. Tries APFS clone first (instant on
/// same-volume copies), otherwise falls back to a kernel-optimized data copy.
/// Preserves mtime/mode and extended attributes, matching Finder's behavior.
#[cfg(target_vendor = "apple")]
fn copyfile_native(src: &Path, dst: &Path) -> std::io::Result<()> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;

    let src_c = CString::new(src.as_os_str().as_bytes())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;
    let dst_c = CString::new(dst.as_os_str().as_bytes())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;

    let flags = libc::COPYFILE_CLONE
        | libc::COPYFILE_DATA
        | libc::COPYFILE_STAT
        | libc::COPYFILE_XATTR;

    let rc = unsafe {
        libc::copyfile(src_c.as_ptr(), dst_c.as_ptr(), std::ptr::null_mut(), flags)
    };

    if rc != 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

/// Cross-platform fallback: chunked read/write with a generous 2 MiB buffer.
#[cfg(not(target_vendor = "apple"))]
fn copyfile_native(src: &Path, dst: &Path) -> std::io::Result<()> {
    use std::io::{Read, Write};

    const BUF_SIZE: usize = 2 * 1024 * 1024;
    let mut src_file = std::fs::File::open(src)?;
    let mut dst_file = std::fs::File::create(dst)?;
    let mut buf = vec![0u8; BUF_SIZE];
    loop {
        let n = src_file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        dst_file.write_all(&buf[..n])?;
    }
    dst_file.flush()?;
    Ok(())
}

/// Spawn a background watcher that polls the destination file's size and feeds
/// the byte counter, so the progress bar moves smoothly during a long copy.
/// Returns a stop flag, the join handle, and the last observed dest size.
fn spawn_size_watcher(
    dst_path: PathBuf,
    bytes_copied: Arc<AtomicU64>,
) -> (Arc<AtomicBool>, tokio::task::JoinHandle<()>, Arc<AtomicU64>) {
    let stop = Arc::new(AtomicBool::new(false));
    let last = Arc::new(AtomicU64::new(0));
    let stop_c = stop.clone();
    let last_c = last.clone();

    let handle = tokio::spawn(async move {
        while !stop_c.load(Ordering::Relaxed) {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if let Ok(meta) = tokio::fs::metadata(&dst_path).await {
                let cur = meta.len();
                let prev = last_c.load(Ordering::Relaxed);
                if cur > prev {
                    bytes_copied.fetch_add(cur - prev, Ordering::Relaxed);
                    last_c.store(cur, Ordering::Relaxed);
                }
            }
        }
    });

    (stop, handle, last)
}

async fn copy_one(
    src: PathBuf,
    dst: PathBuf,
    expected_size: u64,
    bytes_copied: Arc<AtomicU64>,
) -> std::io::Result<()> {
    let watcher = if expected_size > SIZE_WATCH_THRESHOLD {
        Some(spawn_size_watcher(dst.clone(), bytes_copied.clone()))
    } else {
        None
    };

    let copy_result = tokio::task::spawn_blocking(move || copyfile_native(&src, &dst))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    // Stop watcher and reconcile final byte count
    if let Some((stop, handle, last)) = watcher {
        stop.store(true, Ordering::Relaxed);
        let _ = handle.await;
        let already_counted = last.load(Ordering::Relaxed);
        if copy_result.is_ok() && already_counted < expected_size {
            bytes_copied.fetch_add(expected_size - already_counted, Ordering::Relaxed);
        }
    } else if copy_result.is_ok() {
        bytes_copied.fetch_add(expected_size, Ordering::Relaxed);
    }

    copy_result
}

pub async fn copy_files(
    app: AppHandle,
    files: Vec<FileEntry>,
    destination: PathBuf,
    options: CopyOptions,
    cancelled: Arc<Mutex<Arc<AtomicBool>>>,
) -> Result<CopyResult> {
    let start = Instant::now();
    let total = files.len() as u64;

    let bytes_total: u64 = files.iter().map(|f| f.size).sum();
    let bytes_copied = Arc::new(AtomicU64::new(0));
    let files_done = Arc::new(AtomicU64::new(0));
    let errors: Arc<Mutex<Vec<CopyError>>> = Arc::new(Mutex::new(Vec::new()));

    let concurrency = usize::min(num_cpus(), 8);
    let sem = Arc::new(Semaphore::new(concurrency));

    let cancel_flag = {
        let guard = cancelled.lock().await;
        guard.clone()
    };

    // Progress reporter
    let bytes_copied_reporter = bytes_copied.clone();
    let files_done_reporter = files_done.clone();
    let app_reporter = app.clone();
    let cancel_reporter = cancel_flag.clone();

    let reporter_handle = tokio::spawn(async move {
        loop {
            if cancel_reporter.load(Ordering::Relaxed) {
                break;
            }
            let bc = bytes_copied_reporter.load(Ordering::Relaxed);
            let fd = files_done_reporter.load(Ordering::Relaxed);
            let _ = app_reporter.emit(
                "copy:progress",
                CopyProgressPayload {
                    bytes_copied: bc,
                    bytes_total,
                    files_done: fd,
                    files_total: total,
                },
            );
            if fd >= total {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    });

    let mut handles = Vec::new();

    for (i, file) in files.into_iter().enumerate() {
        if cancel_flag.load(Ordering::Relaxed) {
            break;
        }

        let permit = sem.clone().acquire_owned().await?;
        let app_task = app.clone();
        let dest_root = destination.clone();
        let opts = options.clone();
        let bytes_copied_task = bytes_copied.clone();
        let files_done_task = files_done.clone();
        let errors_task = errors.clone();
        let cancel_task = cancel_flag.clone();

        handles.push(tokio::spawn(async move {
            let _permit = permit;

            if cancel_task.load(Ordering::Relaxed) {
                return;
            }

            let src_path = PathBuf::from(&file.path);

            // Compute destination path
            let dest_dir = if opts.dated_subfolders {
                let date_str = file.modified.format("%m-%d-%Y").to_string();
                dest_root.join(date_str)
            } else {
                dest_root.clone()
            };

            if let Err(e) = tokio::fs::create_dir_all(&dest_dir).await {
                let msg = format!("Failed to create dir {}: {}", dest_dir.display(), e);
                let _ = app_task.emit(
                    "copy:file-error",
                    CopyFileErrorPayload {
                        path: file.path.clone(),
                        error: msg.clone(),
                    },
                );
                errors_task.lock().await.push(CopyError {
                    path: file.path,
                    error: msg,
                });
                files_done_task.fetch_add(1, Ordering::Relaxed);
                return;
            }

            let dest_path = dest_dir.join(&file.name);

            // Skip if exists and not overwriting
            if !opts.overwrite_existing && dest_path.exists() {
                bytes_copied_task.fetch_add(file.size, Ordering::Relaxed);
                let _ = app_task.emit(
                    "copy:file-done",
                    CopyFileDonePayload {
                        path: file.path.clone(),
                        index: i as u64,
                        total,
                    },
                );
                files_done_task.fetch_add(1, Ordering::Relaxed);
                return;
            }

            // copyfile() refuses to overwrite by default; remove the existing
            // destination first if the user opted in to overwriting.
            if opts.overwrite_existing && dest_path.exists() {
                let _ = tokio::fs::remove_file(&dest_path).await;
            }

            match copy_one(src_path, dest_path, file.size, bytes_copied_task).await {
                Ok(()) => {
                    let _ = app_task.emit(
                        "copy:file-done",
                        CopyFileDonePayload {
                            path: file.path.clone(),
                            index: i as u64,
                            total,
                        },
                    );
                }
                Err(e) => {
                    let msg = e.to_string();
                    let _ = app_task.emit(
                        "copy:file-error",
                        CopyFileErrorPayload {
                            path: file.path.clone(),
                            error: msg.clone(),
                        },
                    );
                    errors_task.lock().await.push(CopyError {
                        path: file.path,
                        error: msg,
                    });
                }
            }

            files_done_task.fetch_add(1, Ordering::Relaxed);
        }));
    }

    for h in handles {
        let _ = h.await;
    }

    reporter_handle.abort();

    let duration_ms = start.elapsed().as_millis() as u64;
    let all_errors = errors.lock().await.clone();
    let failed = all_errors.len() as u64;
    let succeeded = total.saturating_sub(failed);

    app.emit(
        "copy:complete",
        CopyCompletePayload {
            succeeded,
            failed,
            duration_ms,
            errors: all_errors.clone(),
        },
    )?;

    Ok(CopyResult {
        succeeded,
        failed,
        duration_ms,
        errors: all_errors,
    })
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
}
