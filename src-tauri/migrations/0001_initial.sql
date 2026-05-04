CREATE TABLE IF NOT EXISTS folder_pairs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    destination TEXT NOT NULL,
    last_used   TEXT NOT NULL,
    use_count   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(source, destination)
);

CREATE INDEX IF NOT EXISTS idx_folder_pairs_last_used
    ON folder_pairs(last_used DESC);
