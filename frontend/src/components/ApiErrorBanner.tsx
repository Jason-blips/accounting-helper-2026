import { useState, useEffect } from 'react';

export const EVENT_API_NETWORK_ERROR = 'counting-helper:api-network-error';

export function notifyApiNetworkError() {
  window.dispatchEvent(new CustomEvent(EVENT_API_NETWORK_ERROR));
}

/**
 * Shows a banner when an API request fails due to network (no response).
 * Listens for events dispatched from the api interceptor.
 */
export default function ApiErrorBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => {
      setDismissed(false);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    };
    window.addEventListener(EVENT_API_NETWORK_ERROR, handler);
    return () => window.removeEventListener(EVENT_API_NETWORK_ERROR, handler);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-2 text-sm shadow">
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        无法连接服务器，请检查网络后重试
      </span>
      <button
        type="button"
        onClick={() => { setDismissed(true); setVisible(false); }}
        className="shrink-0 px-2 py-1 rounded hover:bg-white/20"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
}
