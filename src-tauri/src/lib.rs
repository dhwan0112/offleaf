use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::Manager;
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
    engine: Option<String>, // "xelatex", "pdflatex", "lualatex"
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
        else if line.starts_with("l.") {
            if let Some(num_end) = line[2..].find(' ') {
                if let Ok(line_num) = line[2..2 + num_end].parse::<i32>() {
                    let msg = line[2 + num_end..].trim().to_string();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            check_latex_installation,
            save_project,
            load_project,
            get_projects_dir,
            save_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
