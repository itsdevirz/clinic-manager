use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn get_search_directories(resource_dir: Option<PathBuf>) -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    // 1. Directory where the executable is located
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            dirs.push(exe_dir.to_path_buf());
            dirs.push(exe_dir.join("resources"));
            dirs.push(exe_dir.join("dist-server"));
        }
    }

    // 2. Tauri resource directory (for NSIS bundled installs)
    if let Some(res) = resource_dir {
        dirs.push(res.clone());
        dirs.push(res.join("dist-server"));
        dirs.push(res.join("resources"));
    }

    // 3. Current working directory
    if let Ok(cwd) = std::env::current_dir() {
        dirs.push(cwd.clone());
        dirs.push(cwd.join("resources"));
        dirs.push(cwd.join("dist-server"));
    }

    dirs
}

fn spawn_backend_process(resource_dir: Option<PathBuf>) {
    let search_dirs = get_search_directories(resource_dir);

    // 1. Search for bundled portable Node.js runtime (node.exe) + server.cjs
    let node_bin_names = ["node.exe", "dist-server/node.exe", "node"];
    let script_names = ["server.cjs", "dist-server/server.cjs"];

    for base_dir in &search_dirs {
        for node_name in &node_bin_names {
            let node_path = base_dir.join(node_name);
            if node_path.is_file() {
                for script_base in &search_dirs {
                    for script_name in &script_names {
                        let script_path = script_base.join(script_name);
                        if script_path.is_file() {
                            let work_dir = script_path.parent().unwrap_or(script_base);
                            let mut cmd = Command::new(&node_path);
                            cmd.arg(&script_path)
                                .current_dir(work_dir)
                                .env("NODE_ENV", "production")
                                .env("PORT", "3000")
                                .stdout(std::process::Stdio::null())
                                .stderr(std::process::Stdio::null());

                            #[cfg(windows)]
                            {
                                use std::os::windows::process::CommandExt;
                                const CREATE_NO_WINDOW: u32 = 0x08000000;
                                cmd.creation_flags(CREATE_NO_WINDOW);
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
    }

    // 2. Search for standalone compiled backend binary (.exe on Windows)
    let binary_names = [
        "backend-server.exe",
        "server.exe",
        "backend-server",
        "server",
    ];

    for base_dir in &search_dirs {
        for name in &binary_names {
            let candidate = base_dir.join(name);
            if candidate.is_file() {
                let work_dir = candidate.parent().unwrap_or(base_dir);
                let mut cmd = Command::new(&candidate);
                cmd.current_dir(work_dir)
                    .env("NODE_ENV", "production")
                    .env("PORT", "3000")
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null());

                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    cmd.creation_flags(CREATE_NO_WINDOW);
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

    // 3. Fallback to system "node" in PATH if bundled node was not found
    for script_base in &search_dirs {
        for name in &script_names {
            let candidate = script_base.join(name);
            if candidate.is_file() {
                let work_dir = candidate.parent().unwrap_or(script_base);
                let mut cmd = Command::new("node");
                cmd.arg(&candidate)
                    .current_dir(work_dir)
                    .env("NODE_ENV", "production")
                    .env("PORT", "3000")
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null());

                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    cmd.creation_flags(CREATE_NO_WINDOW);
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

fn kill_backend_process() {
    if let Ok(mut lock) = BACKEND_CHILD.lock() {
        if let Some(mut child) = lock.take() {
            let _ = child.kill();
            #[cfg(windows)]
            {
                let pid = child.id();
                let _ = Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .spawn();
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let resource_dir = app.path().resource_dir().ok();
            spawn_backend_process(resource_dir);
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
