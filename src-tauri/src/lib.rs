use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn get_search_directories(resource_dir: Option<PathBuf>) -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            dirs.push(exe_dir.to_path_buf());
            dirs.push(exe_dir.join("dist-server"));
        }
    }
    if let Some(res) = resource_dir {
        dirs.push(res.clone());
        dirs.push(res.join("dist-server"));
    }
    if let Ok(cwd) = std::env::current_dir() {
        dirs.push(cwd.clone());
        dirs.push(cwd.join("dist-server"));
    }
    dirs
}

fn spawn_backend_process(resource_dir: Option<PathBuf>) {
    let dirs = get_search_directories(resource_dir);

    // 1. Try standalone executable first
    for dir in &dirs {
        let exe_candidate = dir.join("backend-server.exe");
        if exe_candidate.exists() {
            let mut cmd = Command::new(&exe_candidate);
            cmd.env("PORT", "3000").env("NODE_ENV", "production");
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }
            if let Ok(child) = cmd.spawn() {
                if let Ok(mut lock) = BACKEND_CHILD.lock() {
                    *lock = Some(child);
                }
                return;
            }
        }
    }

    // 2. Try Node.js runner with server.cjs
    let node_bin_names = ["node.exe", "node"];
    let script_names = ["server.cjs", "dist-server/server.cjs"];

    for dir in &dirs {
        for script_name in &script_names {
            let script_path = dir.join(script_name);
            if !script_path.exists() {
                continue;
            }

            for node_bin in &node_bin_names {
                let node_path = if node_bin.contains(".exe") {
                    dir.join(node_bin)
                } else {
                    PathBuf::from(node_bin)
                };

                if node_path.is_relative() || node_path.exists() {
                    let mut cmd = Command::new(&node_path);
                    cmd.arg(&script_path);
                    cmd.env("PORT", "3000").env("NODE_ENV", "production");
                    #[cfg(windows)]
                    {
                        use std::os::windows::process::CommandExt;
                        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                    }
                    if let Ok(child) = cmd.spawn() {
                        if let Ok(mut lock) = BACKEND_CHILD.lock() {
                            *lock = Some(child);
                        }
                        return;
                    }
                }
            }
        }
    }
}

fn kill_backend_process() {
    if let Ok(mut lock) = BACKEND_CHILD.lock() {
        if let Some(mut child) = lock.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "backend-server.exe"])
            .output();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_dir = app.path().resource_dir().ok();
            spawn_backend_process(resource_dir);
            Ok(())
        })
        .on_window_event(|_app, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                kill_backend_process();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
