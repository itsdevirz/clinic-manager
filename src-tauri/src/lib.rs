use std::process::{Child, Command};
use std::sync::Mutex;

static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn spawn_backend_process() {
    // 1. Check if compiled standalone backend binary exists
    let binary_candidates = [
        "backend-server.exe",
        "server.exe",
        "resources/backend-server.exe",
        "resources/server.exe",
        "dist-server/backend-server.exe",
        "backend-server",
        "server",
    ];

    for candidate in &binary_candidates {
        if std::path::Path::new(candidate).exists() {
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                if let Ok(child) = Command::new(candidate)
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
                {
                    if let Ok(mut lock) = BACKEND_CHILD.lock() {
                        *lock = Some(child);
                    }
                    return;
                }
            }
            #[cfg(not(windows))]
            {
                if let Ok(child) = Command::new(candidate).spawn() {
                    if let Ok(mut lock) = BACKEND_CHILD.lock() {
                        *lock = Some(child);
                    }
                    return;
                }
            }
        }
    }

    // 2. Check if bundled Node.js server.cjs exists
    let script_candidates = [
        "dist-server/server.cjs",
        "server.cjs",
        "resources/dist-server/server.cjs",
        "resources/server.cjs",
    ];

    for candidate in &script_candidates {
        if std::path::Path::new(candidate).exists() {
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                if let Ok(child) = Command::new("node")
                    .arg(candidate)
                    .env("NODE_ENV", "production")
                    .env("PORT", "3000")
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
                {
                    if let Ok(mut lock) = BACKEND_CHILD.lock() {
                        *lock = Some(child);
                    }
                    return;
                }
            }
            #[cfg(not(windows))]
            {
                if let Ok(child) = Command::new("node")
                    .arg(candidate)
                    .env("NODE_ENV", "production")
                    .env("PORT", "3000")
                    .spawn()
                {
                    if let Ok(mut lock) = BACKEND_CHILD.lock() {
                        *lock = Some(child);
                    }
                    return;
                }
            }
        }
    }
}

fn kill_backend_process() {
    if let Ok(mut lock) = BACKEND_CHILD.lock() {
        if let Some(mut child) = lock.take() {
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            spawn_backend_process();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running clinic management desktop application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
            kill_backend_process();
        }
    });
}
