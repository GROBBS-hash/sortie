use crate::types::{Item, Loadout, LoadoutsFile, Settings};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .config_dir()
        .map_err(|e| format!("could not resolve config dir: {e}"))?;
    Ok(base.join("LoadOut"))
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("loadouts.json"))
}

fn seed_loadout() -> Loadout {
    Loadout {
        id: "seed-osrs-grind".into(),
        name: "OSRS Grind".into(),
        icon: "🗡️".into(),
        created_at: "2026-07-12T00:00:00Z".into(),
        last_launched_at: None,
        launch_count: 0,
        items: vec![
            Item::App {
                id: "seed-runelite".into(),
                label: "RuneLite".into(),
                path: r"C:\Users\X\AppData\Local\RuneLite\RuneLite.exe".into(),
                args: "".into(),
                delay_after_ms: 5000,
                enabled: true,
            },
            Item::Steam {
                id: "seed-lethal-company".into(),
                label: "Lethal Company".into(),
                steam_app_id: "1966720".into(),
                delay_after_ms: 0,
                enabled: true,
            },
            Item::Url {
                id: "seed-osrs-wiki".into(),
                label: "OSRS Wiki".into(),
                url: "https://oldschool.runescape.wiki".into(),
                delay_after_ms: 0,
                enabled: true,
            },
        ],
    }
}

fn default_file() -> LoadoutsFile {
    LoadoutsFile {
        version: 1,
        settings: Settings::default(),
        loadouts: vec![seed_loadout()],
    }
}

fn write_file(path: &PathBuf, data: &LoadoutsFile) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn read_loadouts(app: &AppHandle) -> Result<LoadoutsFile, String> {
    let path = config_path(app)?;

    if !path.exists() {
        let data = default_file();
        write_file(&path, &data)?;
        return Ok(data);
    }

    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    match serde_json::from_str::<LoadoutsFile>(&raw) {
        Ok(data) => Ok(data),
        Err(_) => {
            // Corrupt file: preserve it for inspection, then start fresh.
            let backup = path.with_file_name("loadouts.backup.json");
            let _ = fs::rename(&path, &backup);
            let data = default_file();
            write_file(&path, &data)?;
            Ok(data)
        }
    }
}

pub fn write_loadouts(app: &AppHandle, data: &LoadoutsFile) -> Result<(), String> {
    let path = config_path(app)?;
    write_file(&path, data)
}

#[tauri::command]
pub fn get_loadouts(app: AppHandle) -> Result<LoadoutsFile, String> {
    read_loadouts(&app)
}

#[tauri::command]
pub fn save_loadouts(app: AppHandle, data: LoadoutsFile) -> Result<(), String> {
    write_loadouts(&app, &data)
}
