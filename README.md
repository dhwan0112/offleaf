# OffLeaf - Offline LaTeX Editor

A powerful offline LaTeX editor with native **XeLaTeX** support. Think Overleaf, but runs completely offline as a desktop application.

## Features

- **Native XeLaTeX Support**: Uses your local TeX Live installation for full XeLaTeX/pdfLaTeX/LuaLaTeX compilation
- **Unicode & Custom Fonts**: XeLaTeX enables full Unicode support and system font access
- **Monaco Editor**: VS Code-like editing with LaTeX syntax highlighting and auto-completion
- **Live PDF Preview**: Real-time document preview with zoom and navigation
- **Project Management**: Create and manage multiple LaTeX projects
- **Cross-Platform**: Windows, macOS, and Linux support via Tauri
- **Lightweight**: ~10MB app size (vs 100MB+ for Electron apps)

## Requirements

- **TeX Live** (or similar LaTeX distribution) installed on your system
  - macOS: `brew install --cask mactex`
  - Ubuntu/Debian: `sudo apt install texlive-xetex texlive-fonts-recommended`
  - Windows: Download from [tug.org/texlive](https://tug.org/texlive/)

## Tech Stack

- **Tauri 2** - Lightweight native app framework (Rust backend)
- **React 19** + **TypeScript** - Modern UI framework
- **Vite** - Fast build tool
- **Monaco Editor** - Code editor from VS Code
- **PDF.js** - PDF rendering
- **Zustand** - State management
- **Tailwind CSS v4** - Styling

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development (web only)
npm run dev

# Start Tauri development (desktop app)
npm run tauri:dev
```

### Build Desktop App

```bash
# Build for your platform
npm run tauri:build

# The executable will be in:
# - Windows: src-tauri/target/release/offleaf.exe
# - macOS: src-tauri/target/release/bundle/macos/OffLeaf.app
# - Linux: src-tauri/target/release/offleaf
```

## Usage

1. Launch the OffLeaf app
2. Create a new project or use the default one
3. Write your LaTeX code in the editor
4. Press `Ctrl+Enter` or click "Compile" to generate PDF
5. View the PDF preview on the right side
6. Download or save the PDF

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Compile document |
| `Ctrl+S` | Save and compile |
| `Ctrl+/` | Toggle comment |
| `Ctrl+Space` | Trigger autocomplete |

## LaTeX Engine Selection

OffLeaf supports multiple LaTeX engines:

- **XeLaTeX** (default) - Best for Unicode, custom fonts, Korean/CJK text
- **pdfLaTeX** - Traditional LaTeX, fastest compilation
- **LuaLaTeX** - Modern engine with Lua scripting

## Example Document

```latex
\documentclass{article}
\usepackage{fontspec}
\usepackage{kotex}  % For Korean support

\setmainfont{Noto Sans CJK KR}

\title{안녕하세요 OffLeaf}
\author{Your Name}

\begin{document}
\maketitle

\section{Introduction}
This is a test document with Korean text: 한글 테스트입니다.

\section{Math}
Einstein's famous equation: $E = mc^2$

\end{document}
```

## Project Structure

```
offleaf/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── lib/               # Core libraries
│   │   └── latex/         # LaTeX compilation
│   └── stores/            # Zustand state
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Tauri commands
│   │   └── main.rs        # Entry point
│   └── tauri.conf.json    # Tauri config
└── package.json
```

## Browser Mode (Limited)

OffLeaf can also run in browser mode with limited functionality:
- Uses SwiftLaTeX (WebAssembly) instead of native XeLaTeX
- No custom font support
- Limited package availability

```bash
npm run dev      # Start web server
npm run build    # Build for web deployment
```

## License

MIT
