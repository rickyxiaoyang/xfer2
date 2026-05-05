fn main() {
    // Re-run the build script (and re-bake icons into the binary) whenever
    // any icon file changes. Cargo doesn't watch image files by default.
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed=tauri.conf.json");

    tauri_build::build()
}
