use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(rename = "launchOnStartup")]
    pub launch_on_startup: bool,
    #[serde(rename = "minimizeToTray")]
    pub minimize_to_tray: bool,
    #[serde(rename = "defaultDelayMs")]
    pub default_delay_ms: u64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            launch_on_startup: false,
            minimize_to_tray: true,
            default_delay_ms: 0,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Item {
    App {
        id: String,
        label: String,
        path: String,
        args: String,
        #[serde(rename = "delayAfterMs")]
        delay_after_ms: u64,
        enabled: bool,
    },
    Steam {
        id: String,
        label: String,
        #[serde(rename = "steamAppId")]
        steam_app_id: String,
        #[serde(rename = "delayAfterMs")]
        delay_after_ms: u64,
        enabled: bool,
    },
    Url {
        id: String,
        label: String,
        url: String,
        #[serde(rename = "delayAfterMs")]
        delay_after_ms: u64,
        enabled: bool,
    },
}

impl Item {
    pub fn enabled(&self) -> bool {
        match self {
            Item::App { enabled, .. } => *enabled,
            Item::Steam { enabled, .. } => *enabled,
            Item::Url { enabled, .. } => *enabled,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            Item::App { label, .. } => label,
            Item::Steam { label, .. } => label,
            Item::Url { label, .. } => label,
        }
    }

    pub fn delay_after_ms(&self) -> u64 {
        match self {
            Item::App { delay_after_ms, .. } => *delay_after_ms,
            Item::Steam { delay_after_ms, .. } => *delay_after_ms,
            Item::Url { delay_after_ms, .. } => *delay_after_ms,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Loadout {
    pub id: String,
    pub name: String,
    pub icon: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastLaunchedAt")]
    pub last_launched_at: Option<String>,
    #[serde(rename = "launchCount")]
    pub launch_count: u32,
    pub items: Vec<Item>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadoutsFile {
    pub version: u32,
    pub settings: Settings,
    pub loadouts: Vec<Loadout>,
}
