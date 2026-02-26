interface ErrorBannerProps {
  message: string;
  className?: string;
}

/** 统一的表单/页面错误提示条 */
export default function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  return (
    <div
      className={`card p-4 bg-red-50 border border-red-200 rounded-xl ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-red-700">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}
