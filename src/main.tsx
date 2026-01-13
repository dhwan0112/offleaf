import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Safe localStorage check - clear if corrupted
function ensureLocalStorageWorks(): void {
  try {
    const testKey = '__offleaf_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
  } catch (e) {
    console.warn('localStorage not available or corrupted:', e);
  }
}

// Clear potentially corrupted storage data
function clearCorruptedStorage(): void {
  try {
    const keys = ['offleaf-editor-settings', 'offleaf-files'];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          JSON.parse(value);
        } catch {
          console.warn(`Clearing corrupted localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to check localStorage:', e);
  }
}

// Initialize storage checks
ensureLocalStorageWorks();
clearCorruptedStorage();

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
};

// Render error UI helper
function renderErrorUI(rootElement: HTMLElement, title: string, message: string, details?: string): void {
  rootElement.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e1e1e;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="text-align: center; max-width: 500px; padding: 20px;">
        <h1 style="color: #f44336; margin-bottom: 10px;">${title}</h1>
        <p style="color: #999; margin-bottom: 15px;">${message}</p>
        ${details ? `<pre style="
          background: #252526;
          padding: 12px;
          border-radius: 4px;
          text-align: left;
          overflow: auto;
          max-height: 200px;
          font-size: 12px;
          color: #f44336;
          margin-bottom: 15px;
          white-space: pre-wrap;
          word-break: break-all;
        ">${details}</pre>` : ''}
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="localStorage.clear(); location.reload();" style="
            padding: 10px 20px;
            background: #4CAF50;
            border: none;
            color: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
          ">초기화 후 재시작</button>
          <button onclick="location.reload();" style="
            padding: 10px 20px;
            background: #666;
            border: none;
            color: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
          ">새로고침</button>
        </div>
      </div>
    </div>
  `;
}

// Get root element with null check
const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color: white; padding: 20px;">Root element not found. Please reinstall the application.</div>';
} else {
  try {
    console.log('Starting OffLeaf app...');
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('OffLeaf app rendered successfully');
  } catch (error) {
    console.error('Failed to render app:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    renderErrorUI(
      rootElement,
      '앱 시작 실패',
      '애플리케이션을 시작하는 중 오류가 발생했습니다.',
      errorStack || errorMessage
    );
  }
}
