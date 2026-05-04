use std::path::PathBuf;

use tauri::{AppHandle, State};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};

use crate::{
    copy, db, scan,
    types::{CompareMode, CopyOptions, CopyResult, FileEntry, FolderPair, ScanResult},
    AppState,
};

#[tauri::command]
pub async fn pick_folder(app: AppHandle, title: String) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<String>>();
    FileDialogBuilder::new(app.dialog().clone())
        .set_title(&title)
        .pick_folder(move |path| {
            let result = path.and_then(|p| p.into_path().ok()).map(|p| p.to_string_lossy().to_string());
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_folder_pairs(state: State<'_, AppState>) -> Result<Vec<FolderPair>, String> {
    db::list_folder_pairs(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_folder_pair(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    db::delete_folder_pair(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan(
    app: AppHandle,
    state: State<'_, AppState>,
    source: String,
    destination: String,
    mode: CompareMode,
) -> Result<ScanResult, String> {
    state.reset_scan_cancel().await;
    let cancel = state.scan_cancel.clone();

    let start = std::time::Instant::now();

    let files = scan::scan_folders(
        app,
        PathBuf::from(&source),
        PathBuf::from(&destination),
        mode,
        cancel,
    )
    .await
    .map_err(|e| e.to_string())?;

    let duration_ms = start.elapsed().as_millis() as u64;

    let pool = state.db.clone();
    tokio::spawn(async move {
        let _ = db::upsert_folder_pair(&pool, &source, &destination).await;
    });

    Ok(ScanResult { files, duration_ms })
}

#[tauri::command]
pub async fn copy_files(
    app: AppHandle,
    state: State<'_, AppState>,
    files: Vec<FileEntry>,
    destination: String,
    options: CopyOptions,
) -> Result<CopyResult, String> {
    state.reset_copy_cancel().await;
    let cancel = state.copy_cancel.clone();

    copy::copy_files(app, files, PathBuf::from(destination), options, cancel)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_scan().await;
    Ok(())
}

#[tauri::command]
pub async fn cancel_copy(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_copy().await;
    Ok(())
}
