use std::path::PathBuf;

fn get_platform_binary_name() -> &'static str {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    match (os, arch) {
        ("macos", "aarch64") => "codex-aarch64-apple-darwin",
        ("macos", "x86_64") => "codex-x86_64-apple-darwin",
        ("linux", "x86_64") => "codex-x86_64-unknown-linux-musl",
        ("linux", "aarch64") => "codex-aarch64-unknown-linux-musl",
        ("windows", "x86_64") => "codex-x86_64-pc-windows-msvc.exe",
        _ => "codex", // fallback
    }
}

pub fn discover_codex_command() -> Option<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_default();
    let binary_name = get_platform_binary_name();

    // 0) Optional override via environment variable
    if let Ok(explicit) = std::env::var("CODEX_PATH") {
        let p = PathBuf::from(&explicit);
        if p.exists() {
            log::debug!("Using CODEX_PATH override at {}", p.display());
            return Some(p);
        } else {
            log::warn!("CODEX_PATH provided but not found: {}", explicit);
        }
    }

    // First priority: Check actual binary locations in node_modules
    let binary_locations = [
        // Bun global installation
        format!(
            "{}/.bun/install/global/node_modules/@openai/codex/bin/{}",
            home, binary_name
        ),
        // NPM rootless (user) global installation
        format!(
            "{}/.local/share/npm/lib/node_modules/@openai/codex/bin/{}",
            home, binary_name
        ),
        // NPM global installations
        format!(
            "/usr/local/lib/node_modules/@openai/codex/bin/{}",
            binary_name
        ),
        format!(
            "/opt/homebrew/lib/node_modules/@openai/codex/bin/{}",
            binary_name
        ),
    ];

    for path in &binary_locations {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            log::debug!("Found codex binary at {}", path);
            return Some(path_buf);
        }
    }

    // Windows npm global installation paths
    if cfg!(windows) {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let npm_paths = [
                format!("{}/npm/codex.cmd", appdata),
                format!("{}/npm/codex.ps1", appdata),
                format!("{}/npm/codex", appdata),
            ];
            for path in &npm_paths {
                let path_buf = PathBuf::from(path);
                if path_buf.exists() {
                    log::debug!("Found npm codex at {}", path);
                    return Some(path_buf);
                }
            }
        }
    }

    // Second priority: Check if there are native rust/cargo installations
    let native_paths = [
        format!("{}/.cargo/bin/codex", home),
        format!("{}/.cargo/bin/codex.exe", home),
        "/usr/local/bin/codex".to_string(),
        "/opt/homebrew/bin/codex".to_string(),
    ];

    for path in &native_paths {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            // Check if it's a real binary (not a js wrapper)
            if let Ok(content) = std::fs::read_to_string(&path_buf) {
                if content.contains("codex.js") || content.starts_with("#!/usr/bin/env node") {
                    // This is a wrapper script, skip it
                    log::debug!("Skipping wrapper script at {}", path);
                    continue;
                }
            }
            log::debug!("Found native codex binary at {}", path);
            return Some(path_buf);
        }
    }

    if let Ok(path_env) = std::env::var("PATH") {
        let separator = if cfg!(windows) { ';' } else { ':' };
        let mut wrapper_candidate: Option<PathBuf> = None;
        let candidate_names: &[&str] = if cfg!(windows) {
            &["codex.exe", "codex.cmd", "codex.ps1", "codex"]
        } else {
            &["codex"]
        };
        for dir in path_env.split(separator) {
            if dir.is_empty() {
                continue;
            }
            for name in candidate_names {
                let candidate = PathBuf::from(dir).join(name);
                if candidate.exists() {
                    if let Ok(content) = std::fs::read_to_string(&candidate) {
                        let is_wrapper = content.contains("codex.js")
                            || content.starts_with("#!/usr/bin/env node")
                            || content.contains("import");
                        if is_wrapper {
                            if wrapper_candidate.is_none() {
                                wrapper_candidate = Some(candidate.clone());
                                log::debug!("Found wrapper script candidate at {} (will use only if no native binary is found)", candidate.display());
                            }
                            continue;
                        }
                    }
                    log::debug!("Found codex in PATH at {}", candidate.display());
                    return Some(candidate);
                }
            }
        }
        if let Some(wrapper) = wrapper_candidate {
            log::debug!("Using wrapper codex from PATH at {} as fallback", wrapper.display());
            return Some(wrapper);
        }
    }

    log::warn!("No codex binary found in common locations or PATH");
    None
}
