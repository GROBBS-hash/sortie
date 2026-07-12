use crate::launch::launch_loadout;
use crate::storage::read_loadouts;
use tauri::menu::{Menu, MenuBuilder, MenuItem};
use tauri::tray::TrayIcon;
use tauri::{AppHandle, Manager, Wry};

pub fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let mut builder = MenuBuilder::new(app);

    let loadouts = read_loadouts(app).map(|d| d.loadouts).unwrap_or_default();

    if loadouts.is_empty() {
        let placeholder = MenuItem::with_id(app, "no-loadouts", "No loadouts yet", false, None::<&str>)?;
        builder = builder.item(&placeholder);
    } else {
        for loadout in &loadouts {
            let label = format!("{} {}", loadout.icon, loadout.name);
            let item = MenuItem::with_id(app, format!("launch:{}", loadout.id), label, true, None::<&str>)?;
            builder = builder.item(&item);
        }
    }

    let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    builder.separator().item(&open_item).item(&quit_item).build()
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    if let Some(loadout_id) = id.strip_prefix("launch:") {
        let app = app.clone();
        let loadout_id = loadout_id.to_string();
        tauri::async_runtime::spawn_blocking(move || {
            let _ = launch_loadout(app, loadout_id);
        });
        return;
    }

    match id {
        "open" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    }
}

#[tauri::command]
pub fn refresh_tray_menu(app: AppHandle) -> Result<(), String> {
    let menu = build_menu(&app).map_err(|e| e.to_string())?;
    let tray = app.state::<TrayIcon<Wry>>();
    tray.set_menu(Some(menu)).map_err(|e| e.to_string())
}
