# OffLeaf - Offline LaTeX Editor

A powerful offline LaTeX editor that runs entirely in your browser. Think Overleaf, but works completely offline.

## Features

- **Offline-First**: Works entirely in your browser with no server required
- **Real LaTeX Compilation**: Uses SwiftLaTeX (WebAssembly) for true LaTeX compilation
- **Monaco Editor**: VS Code-like editing experience with LaTeX syntax highlighting and auto-completion
- **Live PDF Preview**: See your compiled document in real-time
- **Project Management**: Create and manage multiple LaTeX projects
- **Persistent Storage**: Your projects are saved locally using IndexedDB
- **PWA Support**: Install as a desktop app for the best experience

## Tech Stack

- **React 19** + **TypeScript** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Monaco Editor** - Code editor from VS Code
- **SwiftLaTeX** - WebAssembly LaTeX compiler
- **PDF.js** - PDF rendering in the browser
- **Zustand** - Lightweight state management
- **IndexedDB** (via idb) - Persistent local storage
- **Tailwind CSS v4** - Utility-first styling
- **Workbox** - Service worker for offline support

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. Open the app in your browser
2. A default project is created automatically
3. Write your LaTeX code in the editor
4. Press `Ctrl+Enter` or click "Compile" to generate PDF
5. View the PDF preview on the right side
6. Download the PDF using the download button

## Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter` - Compile document
- `Ctrl+S` / `Cmd+S` - Save and compile

## LaTeX Features

The editor supports standard LaTeX with the following packages pre-loaded:
- `amsmath`, `amssymb` - Math symbols and environments
- `graphicx` - Image inclusion
- `hyperref` - Hyperlinks
- And more...

## Offline Usage

After the first load, OffLeaf works completely offline:
1. All assets are cached by the service worker
2. Projects are stored in IndexedDB
3. LaTeX compilation happens locally via WebAssembly

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

## License

MIT
