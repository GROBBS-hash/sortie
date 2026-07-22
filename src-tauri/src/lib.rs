mod detect;
mod launch;
mod steam;
mod storage;
mod tray;
mod types;

use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![
      storage::get_loadouts,
      storage::save_loadouts,
      launch::launch_loadout,
      detect::detect_installed_apps,
      steam::list_steam_games,
      tray::refresh_tray_menu
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let tray_menu = tray::build_menu(app.handle())?;

      let tray_icon = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Sortie")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| tray::handle_menu_event(app, event.id.as_ref()))
        .on_tray_icon_event(|tray, event| {
          if let tauri::tray::TrayIconEvent::Click {
            button: tauri::tray::MouseButton::Left,
            button_state: tauri::tray::MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
        })
        .build(app)?;

      app.manage(tray_icon);

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let minimize = storage::read_loadouts(window.app_handle())
          .map(|d| d.settings.minimize_to_tray)
          .unwrap_or(true);
        if minimize {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
