use crate::storage::{read_loadouts, write_loadouts};
use crate::types::Item;
use serde::Serialize;
use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Serialize)]
struct LaunchProgress {
    #[serde(rename = "loadoutId")]
    loadout_id: String,
    index: usize,
    total: usize,
    label: String,
    status: String, // "launching" | "ok" | "missing" | "error"
    message: Option<String>,
}

#[cfg(windows)]
fn spawn_detached(cmd: &mut Command) -> std::io::Result<std::process::Child> {
    use std::os::windows::process::CommandExt;
    const DETACHED_PROCESS: u32 = 0x0000_0008;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW);
    cmd.spawn()
}

fn open_uri(uri: &str) -> Result<(), String> {
    spawn_detached(Command::new("cmd").args(["/C", "start", ""]).arg(uri))
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn launch_item(item: &Item) -> Result<(), String> {
    match item {
        Item::App { path, args, .. } => {
            if !std::path::Path::new(path).exists() {
                return Err(format!("{path} not found — path may have changed"));
            }
            let mut cmd = Command::new(path);
            if !args.trim().is_empty() {
                cmd.args(args.split_whitespace());
            }
            spawn_detached(&mut cmd).map(|_| ()).map_err(|e| e.to_string())
        }
        Item::Steam { steam_app_id, .. } => {
            open_uri(&format!("steam://rungameid/{steam_app_id}"))
        }
        Item::Url { url, .. } => open_uri(url),
    }
}

#[tauri::command]
pub fn launch_loadout(app: AppHandle, loadout_id: String) -> Result<(), String> {
    let mut data = read_loadouts(&app)?;
    let loadout = data
        .loadouts
        .iter_mut()
        .find(|l| l.id == loadout_id)
        .ok_or_else(|| format!("loadout {loadout_id} not found"))?;

    let items: Vec<Item> = loadout
        .items
        .iter()
        .filter(|i| i.enabled())
        .cloned()
        .collect();
    let total = items.len();

    for (idx, item) in items.iter().enumerate() {
        let label = item.label().to_string();

        let _ = app.emit(
            "launch-progress",
            LaunchProgress {
                loadout_id: loadout_id.clone(),
                index: idx + 1,
                total,
                label: label.clone(),
                status: "launching".into(),
                message: None,
            },
        );

        let (status, message) = match launch_item(item) {
            Ok(()) => ("ok".to_string(), None),
            Err(e) => ("missing".to_string(), Some(e)),
        };

        if let Some(msg) = &message {
            let _ = app
                .notification()
                .builder()
                .title(format!("LoadOut — {label}"))
                .body(msg)
                .show();
        }

        let _ = app.emit(
            "launch-progress",
            LaunchProgress {
                loadout_id: loadout_id.clone(),
                index: idx + 1,
                total,
                label,
                status,
                message,
            },
        );

        let delay = item.delay_after_ms();
        if delay > 0 {
            thread::sleep(Duration::from_millis(delay));
        }
    }

    loadout.last_launched_at = Some(chrono::Utc::now().to_rfc3339());
    loadout.launch_count += 1;
    write_loadouts(&app, &data)?;

    Ok(())
}
