pub mod copy;
pub mod db;
pub mod scan;
pub mod types;

mod commands;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use sqlx::SqlitePool;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: SqlitePool,
    pub scan_cancel: Arc<Mutex<Arc<AtomicBool>>>,
    pub copy_cancel: Arc<Mutex<Arc<AtomicBool>>>,
}

impl AppState {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            scan_cancel: Arc::new(Mutex::new(Arc::new(AtomicBool::new(false)))),
            copy_cancel: Arc::new(Mutex::new(Arc::new(AtomicBool::new(false)))),
        }
    }

    pub async fn reset_scan_cancel(&self) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        *self.scan_cancel.lock().await = flag.clone();
        flag
    }

    pub async fn cancel_scan(&self) {
        self.scan_cancel.lock().await.store(true, Ordering::Relaxed);
    }

    pub async fn reset_copy_cancel(&self) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        *self.copy_cancel.lock().await = flag.clone();
        flag
    }

    pub async fn cancel_copy(&self) {
        self.copy_cancel
            .lock()
            .await
            .store(true, Ordering::Relaxed);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            use tauri::Manager;

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let pool = tauri::async_runtime::block_on(db::init_pool(app_data_dir))
                .expect("failed to init database");

            app.manage(AppState::new(pool));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pick_folder,
            commands::list_folder_pairs,
            commands::delete_folder_pair,
            commands::scan,
            commands::copy_files,
            commands::show_in_finder,
            commands::cancel_scan,
            commands::cancel_copy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
