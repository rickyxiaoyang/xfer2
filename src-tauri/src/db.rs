use anyhow::Result;
use chrono::Utc;
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::path::PathBuf;

use crate::types::FolderPair;

pub async fn init_pool(app_data_dir: PathBuf) -> Result<SqlitePool> {
    std::fs::create_dir_all(&app_data_dir)?;
    let db_path = app_data_dir.join("xfer.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

pub async fn upsert_folder_pair(pool: &SqlitePool, source: &str, dest: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO folder_pairs (source, destination, last_used, use_count)
        VALUES (?1, ?2, ?3, 1)
        ON CONFLICT(source, destination) DO UPDATE SET
            last_used = ?3,
            use_count = use_count + 1
        "#,
    )
    .bind(source)
    .bind(dest)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_folder_pairs(pool: &SqlitePool) -> Result<Vec<FolderPair>> {
    let rows = sqlx::query(
        "SELECT id, source, destination, last_used, use_count FROM folder_pairs ORDER BY last_used DESC LIMIT 20",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let last_used_str: String = row.get("last_used");
            FolderPair {
                id: row.get("id"),
                source: row.get("source"),
                destination: row.get("destination"),
                last_used: chrono::DateTime::parse_from_rfc3339(&last_used_str)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                use_count: row.get("use_count"),
            }
        })
        .collect())
}

pub async fn delete_folder_pair(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM folder_pairs WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
