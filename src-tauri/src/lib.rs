// src-tauri/src/lib.rs

// fetch_image_as_base64: downloads an image URL from Rust (no CORS restrictions)
#[tauri::command]
async fn fetch_image_as_base64(url: String) -> Result<String, String> {
    // Only allow fetching from trusted image CDNs — prevents SSRF attacks
    let allowed_hosts = [
        "media.rawg.io",
        "image.tmdb.org",
        "images.igdb.com",
    ];

    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    let host = parsed.host_str().unwrap_or("");

    if !allowed_hosts.iter().any(|&h| host == h || host.ends_with(&format!(".{}", h))) {
        return Err(format!("URL host '{}' is not in the allowed list", host));
    }

    let response = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?;

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}

// pick_image_file: opens a native file picker and returns the selected image as base64
#[tauri::command]
async fn pick_image_file(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    use base64::Engine;

    // Open native file picker filtered to images
    let file_path = app
        .dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "webp"])
        .blocking_pick_file();

    let path = match file_path {
        Some(p) => p,
        None => return Err("No file selected".to_string()),
    };

    // Read the file bytes
    let path_str = path.to_string();
    let bytes = std::fs::read(&path_str).map_err(|e| e.to_string())?;

    // Determine MIME type from extension
    let ext = std::path::Path::new(&path_str)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/jpeg",
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_image_as_base64, pick_image_file])
        .run(tauri::generate_context!())
        .expect("error while running TierCraft");
}
