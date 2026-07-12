use serde::Serialize;
use std::path::{Path, PathBuf};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

#[derive(Serialize, Clone)]
pub struct DetectedApp {
    pub key: String,
    pub label: String,
    pub path: String,
    pub args: String,
}

pub fn steam_path() -> Option<PathBuf> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu.open_subkey("Software\\Valve\\Steam").ok()?;
    let path: String = key.get_value("SteamPath").ok()?;
    Some(PathBuf::from(path))
}

fn find_medal() -> Option<PathBuf> {
    let local = std::env::var("LOCALAPPDATA").ok()?;
    let medal_dir = PathBuf::from(local).join("Medal");
    let entries = std::fs::read_dir(&medal_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        if name.to_string_lossy().starts_with("app-") {
            let candidate = entry.path().join("Medal.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    None
}

fn push_if_exists(found: &mut Vec<DetectedApp>, key: &str, label: &str, path: &Path, args: &str) {
    if path.exists() {
        found.push(DetectedApp {
            key: key.into(),
            label: label.into(),
            path: path.to_string_lossy().into_owned(),
            args: args.into(),
        });
    }
}

#[tauri::command]
pub fn detect_installed_apps() -> Vec<DetectedApp> {
    let mut found = Vec::new();

    let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let roaming = std::env::var("APPDATA").unwrap_or_default();

    push_if_exists(
        &mut found,
        "discord",
        "Discord",
        &PathBuf::from(&local).join("Discord").join("Update.exe"),
        "--processStart Discord.exe",
    );

    if let Some(steam) = steam_path() {
        push_if_exists(&mut found, "steam", "Steam", &steam.join("steam.exe"), "");
    }

    push_if_exists(
        &mut found,
        "runelite",
        "RuneLite",
        &PathBuf::from(&local).join("RuneLite").join("RuneLite.exe"),
        "",
    );

    push_if_exists(
        &mut found,
        "obs",
        "OBS Studio",
        Path::new(r"C:\Program Files\obs-studio\bin\64bit\obs64.exe"),
        "",
    );

    if let Some(medal) = find_medal() {
        push_if_exists(&mut found, "medal", "Medal", &medal, "");
    }

    push_if_exists(
        &mut found,
        "spotify",
        "Spotify",
        &PathBuf::from(&roaming).join("Spotify").join("Spotify.exe"),
        "",
    );

    push_if_exists(
        &mut found,
        "epic",
        "Epic Games",
        Path::new(
            r"C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe",
        ),
        "",
    );

    push_if_exists(
        &mut found,
        "battlenet",
        "Battle.net",
        Path::new(r"C:\Program Files (x86)\Battle.net\Battle.net.exe"),
        "",
    );

    found
}
