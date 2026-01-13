import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
};

// Get root element with null check
const rootElement = document.getElementById('root');

if (!rootElement) {
  // This should never happen, but just in case
  document.body.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e1e1e;
      color: #e0e0e0;
      font-family: sans-serif;
    ">
      <div style="text-align: center;">
        <h1>Failed to initialize</h1>
        <p>Root element not found</p>
        <button onclick="location.reload()" style="
          margin-top: 16px;
          padding: 8px 16px;
          background: #4CAF50;
          border: none;
          color: white;
          cursor: pointer;
          border-radius: 4px;
        ">Reload</button>
      </div>
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1e1e1e;
        color: #e0e0e0;
        font-family: sans-serif;
      ">
        <div style="text-align: center; max-width: 400px;">
          <h1 style="color: #f44336;">Failed to start</h1>
          <p style="color: #999;">An error occurred while starting the application.</p>
          <pre style="
            background: #252526;
            padding: 12px;
            border-radius: 4px;
            text-align: left;
            overflow: auto;
            max-height: 200px;
            font-size: 12px;
            color: #f44336;
          ">${error instanceof Error ? error.message : String(error)}</pre>
          <button onclick="location.reload()" style="
            margin-top: 16px;
            padding: 8px 16px;
            background: #4CAF50;
            border: none;
            color: white;
            cursor: pointer;
            border-radius: 4px;
          ">Reload</button>
        </div>
      </div>
    `;
  }
}
