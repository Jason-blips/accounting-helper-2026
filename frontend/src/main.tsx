import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

// Hide Capacitor splash screen once app is ready (no-op when not in native app)
function hideSplashWhenReady() {
  if (typeof (window as any).Capacitor !== 'undefined') {
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      requestAnimationFrame(() => {
        setTimeout(() => SplashScreen.hide().catch(() => {}), 100);
      });
    }).catch(() => {});
  }
}

// 确保root元素存在
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('找不到root元素，创建新的root元素');
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  hideSplashWhenReady();
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    hideSplashWhenReady();
  } catch (error) {
    console.error('React渲染失败:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>应用加载失败</h1>
        <p>请刷新页面重试</p>
        <button onclick="location.reload()">刷新页面</button>
      </div>
    `;
  }
}
