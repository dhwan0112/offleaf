use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tempfile::TempDir;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompilationResult {
    success: bool,
    pdf_path: Option<String>,
    pdf_data: Option<Vec<u8>>,
    log: String,
    errors: Vec<CompilationError>,
    warnings: Vec<CompilationWarning>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompilationError {
    line: i32,
    message: String,
    file: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompilationWarning {
    line: i32,
    message: String,
    file: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileRequest {
    content: String,
    files: HashMap<String, String>,
    engine: Option<String>,     // "xelatex", "pdflatex", "lualatex"
    auto_install: Option<bool>, // Auto-install missing packages
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedPackage {
    name: String,
    installed: bool,
    options: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageDetectionResult {
    packages: Vec<DetectedPackage>,
    missing: Vec<String>,
    installed: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutoInstallResult {
    success: bool,
    installed: Vec<String>,
    failed: Vec<String>,
    message: String,
}

// Essential packages that should be pre-installed
pub const ESSENTIAL_PACKAGES: &[&str] = &[
    // Korean/CJK support
    "kotex-utf",
    "cjk",
    "xecjk",
    // Math
    "amsmath",
    "amssymb",
    "amsfonts",
    "mathtools",
    // Graphics
    "graphicx",
    "xcolor",
    "pgf", // includes tikz
    // Tables
    "booktabs",
    "array",
    "tabularx",
    "longtable",
    // Fonts
    "fontspec",
    // Layout
    "geometry",
    "fancyhdr",
    "titlesec",
    // References
    "hyperref",
    "biblatex",
    // Code
    "listings",
    // Misc
    "enumitem",
    "caption",
    "float",
];

/// Parse LaTeX content to extract \usepackage commands
fn parse_usepackages(content: &str) -> Vec<(String, Option<String>)> {
    let mut packages = Vec::new();

    // Match \usepackage[options]{package} or \usepackage{package}
    let re = Regex::new(r"\\usepackage\s*(?:\[([^\]]*)\])?\s*\{([^}]+)\}").unwrap();

    for cap in re.captures_iter(content) {
        let options = cap.get(1).map(|m| m.as_str().to_string());
        let pkg_list = cap.get(2).map(|m| m.as_str()).unwrap_or("");

        for pkg in pkg_list.split(',') {
            let pkg_name = pkg.trim().to_string();
            if !pkg_name.is_empty() {
                packages.push((pkg_name, options.clone()));
            }
        }
    }

    // Also check for \RequirePackage
    let re2 = Regex::new(r"\\RequirePackage\s*(?:\[([^\]]*)\])?\s*\{([^}]+)\}").unwrap();
    for cap in re2.captures_iter(content) {
        let options = cap.get(1).map(|m| m.as_str().to_string());
        let pkg_list = cap.get(2).map(|m| m.as_str()).unwrap_or("");

        for pkg in pkg_list.split(',') {
            let pkg_name = pkg.trim().to_string();
            if !pkg_name.is_empty() {
                packages.push((pkg_name, options.clone()));
            }
        }
    }

    packages
}

/// Check if a package is installed using kpsewhich
async fn is_package_installed(package: &str) -> bool {
    let result = Command::new("kpsewhich")
        .arg(format!("{}.sty", package))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
        .map(|s| s.success())
        .unwrap_or(false);

    if result {
        return true;
    }

    // Try .cls for document classes
    Command::new("kpsewhich")
        .arg(format!("{}.cls", package))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Install missing packages
async fn install_missing_packages(packages: &[String]) -> AutoInstallResult {
    let mut installed = Vec::new();
    let mut failed = Vec::new();

    for pkg in packages {
        let output = Command::new("tlmgr")
            .args(["install", pkg])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;

        match output {
            Ok(out) if out.status.success() => {
                installed.push(pkg.clone());
            }
            _ => {
                failed.push(pkg.clone());
            }
        }
    }

    let success = failed.is_empty();
    let message = if success {
        format!("Successfully installed {} packages", installed.len())
    } else {
        format!(
            "Installed {} packages, {} failed: {}",
            installed.len(),
            failed.len(),
            failed.join(", ")
        )
    };

    AutoInstallResult {
        success,
        installed,
        failed,
        message,
    }
}

fn parse_latex_log(log: &str) -> (Vec<CompilationError>, Vec<CompilationWarning>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    for line in log.lines() {
        // Match error patterns
        if line.starts_with('!') {
            errors.push(CompilationError {
                line: 0,
                message: line.trim_start_matches('!').trim().to_string(),
                file: None,
            });
        }
        // Match line number errors like "l.42 ..."
        else if let Some(stripped) = line.strip_prefix("l.") {
            if let Some(num_end) = stripped.find(' ') {
                if let Ok(line_num) = stripped[..num_end].parse::<i32>() {
                    let msg = stripped[num_end..].trim().to_string();
                    if !msg.is_empty() {
                        errors.push(CompilationError {
                            line: line_num,
                            message: msg,
                            file: None,
                        });
                    }
                }
            }
        }
        // Match warnings
        else if line.contains("Warning:") {
            warnings.push(CompilationWarning {
                line: 0,
                message: line.to_string(),
                file: None,
            });
        }
        // Match LaTeX errors with file info
        else if line.contains("LaTeX Error:") {
            errors.push(CompilationError {
                line: 0,
                message: line.to_string(),
                file: None,
            });
        }
    }

    (errors, warnings)
}

#[tauri::command]
async fn compile_latex(request: CompileRequest) -> Result<CompilationResult, String> {
    // Create temporary directory
    let temp_dir = TempDir::new().map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let temp_path = temp_dir.path();

    // Write main.tex file
    let main_tex_path = temp_path.join("main.tex");
    let mut file = fs::File::create(&main_tex_path)
        .await
        .map_err(|e| format!("Failed to create main.tex: {}", e))?;
    file.write_all(request.content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write main.tex: {}", e))?;

    // Write additional files
    for (filename, content) in &request.files {
        let file_path = temp_path.join(filename);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.ok();
        }
        let mut f = fs::File::create(&file_path)
            .await
            .map_err(|e| format!("Failed to create {}: {}", filename, e))?;
        f.write_all(content.as_bytes())
            .await
            .map_err(|e| format!("Failed to write {}: {}", filename, e))?;
    }

    // Determine the LaTeX engine
    let engine = request.engine.unwrap_or_else(|| "xelatex".to_string());

    // Run LaTeX compiler (twice for references)
    let mut log_output = String::new();

    for pass in 1..=2 {
        let output = Command::new(&engine)
            .args([
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-file-line-error",
                "-output-directory",
                temp_path.to_str().unwrap(),
                main_tex_path.to_str().unwrap(),
            ])
            .current_dir(temp_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to run {}: {}. Is TeX Live installed?", engine, e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if pass == 2 || !output.status.success() {
            log_output = format!("{}\n{}", stdout, stderr);
        }

        // If first pass failed, don't continue
        if !output.status.success() && pass == 1 {
            break;
        }
    }

    // Check for PDF output
    let pdf_path = temp_path.join("main.pdf");
    let (errors, warnings) = parse_latex_log(&log_output);

    if pdf_path.exists() {
        // Read PDF data
        let pdf_data = fs::read(&pdf_path)
            .await
            .map_err(|e| format!("Failed to read PDF: {}", e))?;

        Ok(CompilationResult {
            success: true,
            pdf_path: Some(pdf_path.to_string_lossy().to_string()),
            pdf_data: Some(pdf_data),
            log: log_output,
            errors,
            warnings,
        })
    } else {
        Ok(CompilationResult {
            success: false,
            pdf_path: None,
            pdf_data: None,
            log: log_output,
            errors,
            warnings,
        })
    }
}

#[tauri::command]
async fn check_latex_installation() -> Result<HashMap<String, bool>, String> {
    let mut result = HashMap::new();

    for engine in ["xelatex", "pdflatex", "lualatex"] {
        let available = Command::new(engine)
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false);
        result.insert(engine.to_string(), available);
    }

    Ok(result)
}

#[tauri::command]
async fn save_project(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to save project: {}", e))
}

#[tauri::command]
async fn load_project(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to load project: {}", e))
}

#[tauri::command]
async fn get_projects_dir() -> Result<String, String> {
    let dir = dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("OffLeaf");

    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create projects directory: {}", e))?;

    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_pdf(pdf_data: Vec<u8>, path: String) -> Result<(), String> {
    fs::write(&path, pdf_data)
        .await
        .map_err(|e| format!("Failed to save PDF: {}", e))
}

// ============ Package Manager (tlmgr) Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageInfo {
    name: String,
    description: String,
    installed: bool,
    version: Option<String>,
    size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageSearchResult {
    packages: Vec<PackageInfo>,
    total: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallResult {
    success: bool,
    message: String,
    installed_packages: Vec<String>,
}

/// Check if tlmgr is available
#[tauri::command]
async fn check_tlmgr() -> Result<bool, String> {
    let result = Command::new("tlmgr")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
        .map(|s| s.success())
        .unwrap_or(false);
    Ok(result)
}

/// Search for packages
#[tauri::command]
async fn search_packages(query: String) -> Result<PackageSearchResult, String> {
    let output = Command::new("tlmgr")
        .args(["search", "--global", &query])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr search: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut packages = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Parse tlmgr search output format: "package_name - description" or just "package_name:"
        if let Some(sep_pos) = line.find(" - ") {
            let name = line[..sep_pos].trim().to_string();
            let description = line[sep_pos + 3..].trim().to_string();
            packages.push(PackageInfo {
                name,
                description,
                installed: false,
                version: None,
                size: None,
            });
        } else if line.ends_with(':') {
            let name = line.trim_end_matches(':').to_string();
            packages.push(PackageInfo {
                name,
                description: String::new(),
                installed: false,
                version: None,
                size: None,
            });
        }
    }

    let total = packages.len();
    Ok(PackageSearchResult { packages, total })
}

/// Get list of installed packages
#[tauri::command]
async fn list_installed_packages() -> Result<Vec<PackageInfo>, String> {
    let output = Command::new("tlmgr")
        .args(["list", "--only-installed"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr list: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut packages = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("tlmgr") {
            continue;
        }

        // Parse format: "i package_name: description"
        if let Some(rest) = line.strip_prefix('i') {
            let rest = rest.trim();
            if let Some(colon_pos) = rest.find(':') {
                let name = rest[..colon_pos].trim().to_string();
                let description = rest[colon_pos + 1..].trim().to_string();
                packages.push(PackageInfo {
                    name,
                    description,
                    installed: true,
                    version: None,
                    size: None,
                });
            }
        }
    }

    Ok(packages)
}

/// Get detailed info about a package
#[tauri::command]
async fn get_package_info(package_name: String) -> Result<PackageInfo, String> {
    let output = Command::new("tlmgr")
        .args(["info", &package_name])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr info: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    let mut name = package_name.clone();
    let mut description = String::new();
    let mut installed = false;
    let mut version = None;
    let mut size = None;

    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("package:") {
            name = line.replace("package:", "").trim().to_string();
        } else if line.starts_with("shortdesc:") {
            description = line.replace("shortdesc:", "").trim().to_string();
        } else if line.starts_with("installed:") {
            installed = line.contains("Yes");
        } else if line.starts_with("revision:") {
            version = Some(line.replace("revision:", "").trim().to_string());
        } else if line.starts_with("sizes:") {
            size = Some(line.replace("sizes:", "").trim().to_string());
        }
    }

    Ok(PackageInfo {
        name,
        description,
        installed,
        version,
        size,
    })
}

/// Install a package
#[tauri::command]
async fn install_package(package_name: String) -> Result<InstallResult, String> {
    let output = Command::new("tlmgr")
        .args(["install", &package_name])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr install: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let success = output.status.success();

    let mut installed_packages = Vec::new();

    // Parse installed packages from output
    for line in stdout.lines() {
        if line.contains("Installing") || line.contains("install:") {
            // Extract package name
            if let Some(pkg) = line.split_whitespace().last() {
                installed_packages.push(pkg.trim_matches(|c| c == ':' || c == '.').to_string());
            }
        }
    }

    if installed_packages.is_empty() && success {
        installed_packages.push(package_name.clone());
    }

    Ok(InstallResult {
        success,
        message: if success {
            format!("Successfully installed {}", package_name)
        } else {
            format!("Failed to install {}: {}", package_name, stderr)
        },
        installed_packages,
    })
}

/// Remove a package
#[tauri::command]
async fn remove_package(package_name: String) -> Result<InstallResult, String> {
    let output = Command::new("tlmgr")
        .args(["remove", &package_name])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr remove: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let success = output.status.success();

    Ok(InstallResult {
        success,
        message: if success {
            format!("Successfully removed {}\n{}", package_name, stdout)
        } else {
            format!("Failed to remove {}: {}", package_name, stderr)
        },
        installed_packages: vec![],
    })
}

/// Update all packages
#[tauri::command]
async fn update_packages() -> Result<InstallResult, String> {
    let output = Command::new("tlmgr")
        .args(["update", "--all"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run tlmgr update: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let success = output.status.success();

    Ok(InstallResult {
        success,
        message: if success {
            format!("Update completed:\n{}", stdout)
        } else {
            format!("Update failed: {}", stderr)
        },
        installed_packages: vec![],
    })
}

/// Get popular/recommended packages for Korean LaTeX
#[tauri::command]
async fn get_recommended_packages() -> Vec<PackageInfo> {
    vec![
        PackageInfo {
            name: "kotex".to_string(),
            description: "Korean language support (ko.TeX)".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "cjk".to_string(),
            description: "CJK (Chinese, Japanese, Korean) language support".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "xecjk".to_string(),
            description: "CJK support for XeLaTeX".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "amsmath".to_string(),
            description: "AMS mathematical facilities".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "graphicx".to_string(),
            description: "Enhanced support for graphics".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "hyperref".to_string(),
            description: "Extensive support for hypertext".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "tikz".to_string(),
            description: "Create graphics programmatically".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "biblatex".to_string(),
            description: "Sophisticated bibliographies".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "listings".to_string(),
            description: "Typeset source code listings".to_string(),
            installed: false,
            version: None,
            size: None,
        },
        PackageInfo {
            name: "booktabs".to_string(),
            description: "Publication quality tables".to_string(),
            installed: false,
            version: None,
            size: None,
        },
    ]
}

// ============ Auto Package Detection Commands ============

/// Detect packages used in LaTeX content
#[tauri::command]
async fn detect_packages(content: String) -> Result<PackageDetectionResult, String> {
    let parsed = parse_usepackages(&content);
    let mut packages = Vec::new();
    let mut missing = Vec::new();
    let mut installed_list = Vec::new();

    for (name, options) in parsed {
        let is_installed = is_package_installed(&name).await;

        packages.push(DetectedPackage {
            name: name.clone(),
            installed: is_installed,
            options,
        });

        if is_installed {
            installed_list.push(name);
        } else {
            missing.push(name);
        }
    }

    Ok(PackageDetectionResult {
        packages,
        missing,
        installed: installed_list,
    })
}

/// Auto-install missing packages from content
#[tauri::command]
async fn auto_install_missing(content: String) -> Result<AutoInstallResult, String> {
    let parsed = parse_usepackages(&content);
    let mut missing = Vec::new();

    for (name, _) in parsed {
        if !is_package_installed(&name).await {
            missing.push(name);
        }
    }

    if missing.is_empty() {
        return Ok(AutoInstallResult {
            success: true,
            installed: vec![],
            failed: vec![],
            message: "All packages are already installed".to_string(),
        });
    }

    Ok(install_missing_packages(&missing).await)
}

/// Install essential packages for OffLeaf
#[tauri::command]
async fn install_essential_packages() -> Result<AutoInstallResult, String> {
    let mut missing = Vec::new();

    for pkg in ESSENTIAL_PACKAGES {
        if !is_package_installed(pkg).await {
            missing.push(pkg.to_string());
        }
    }

    if missing.is_empty() {
        return Ok(AutoInstallResult {
            success: true,
            installed: vec![],
            failed: vec![],
            message: "All essential packages are already installed".to_string(),
        });
    }

    Ok(install_missing_packages(&missing).await)
}

/// Get list of essential packages and their status
#[tauri::command]
async fn get_essential_packages() -> Vec<DetectedPackage> {
    let mut result = Vec::new();

    for pkg in ESSENTIAL_PACKAGES {
        let installed = is_package_installed(pkg).await;
        result.push(DetectedPackage {
            name: pkg.to_string(),
            installed,
            options: None,
        });
    }

    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            check_latex_installation,
            save_project,
            load_project,
            get_projects_dir,
            save_pdf,
            // Package manager commands
            check_tlmgr,
            search_packages,
            list_installed_packages,
            get_package_info,
            install_package,
            remove_package,
            update_packages,
            get_recommended_packages,
            // Auto-detection commands
            detect_packages,
            auto_install_missing,
            install_essential_packages,
            get_essential_packages,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = result {
        eprintln!("Error while running tauri application: {}", e);
        #[cfg(target_os = "windows")]
        {
            use std::io::Write;
            let _ = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open("offleaf_error.log")
                .and_then(|mut f| writeln!(f, "Error: {}", e));
        }
        std::process::exit(1);
    }
}
