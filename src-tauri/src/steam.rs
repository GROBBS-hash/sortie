use crate::detect::steam_path;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct SteamGame {
    #[serde(rename = "appId")]
    pub app_id: String,
    pub name: String,
}

/// Parses a single VDF line of the form `"key"    "value"` into (key, value).
fn parse_vdf_line(line: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = line.split('"').collect();
    if parts.len() >= 4 {
        Some((parts[1].to_string(), parts[3].to_string()))
    } else {
        None
    }
}

fn library_folders(steam_root: &Path) -> Vec<PathBuf> {
    let mut libs = vec![steam_root.to_path_buf()];

    let candidates = [
        steam_root.join("steamapps").join("libraryfolders.vdf"),
        steam_root.join("config").join("libraryfolders.vdf"),
    ];

    for candidate in candidates {
        if let Ok(content) = fs::read_to_string(&candidate) {
            for line in content.lines() {
                if let Some((key, value)) = parse_vdf_line(line) {
                    if key == "path" {
                        libs.push(PathBuf::from(value.replace("\\\\", "\\")));
                    }
                }
            }
            break;
        }
    }

    libs
}

#[tauri::command]
pub fn list_steam_games() -> Result<Vec<SteamGame>, String> {
    let steam_root = steam_path().ok_or("Steam not found")?;
    let mut games = Vec::new();

    for lib in library_folders(&steam_root) {
        let apps_dir = lib.join("steamapps");
        let Ok(entries) = fs::read_dir(&apps_dir) else {
            continue;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let is_manifest = path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with("appmanifest_") && n.ends_with(".acf"))
                .unwrap_or(false);
            if !is_manifest {
                continue;
            }

            let Ok(content) = fs::read_to_string(&path) else {
                continue;
            };

            let mut app_id = None;
            let mut name = None;
            for line in content.lines() {
                if let Some((key, value)) = parse_vdf_line(line) {
                    match key.as_str() {
                        "appid" => app_id = Some(value),
                        "name" => name = Some(value),
                        _ => {}
                    }
                }
                if app_id.is_some() && name.is_some() {
                    break;
                }
            }

            if let (Some(app_id), Some(name)) = (app_id, name) {
                games.push(SteamGame { app_id, name });
            }
        }
    }

    games.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    games.dedup_by(|a, b| a.app_id == b.app_id);
    Ok(games)
}
