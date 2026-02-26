import { ReactNode } from 'react';

const DEFAULT_ICON = (
  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** 统一的空状态展示：图标 + 标题 + 可选描述与操作按钮 */
export default function EmptyState({
  title,
  description,
  action,
  icon = DEFAULT_ICON,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`card text-center ${compact ? 'p-6' : 'p-12'} ${className}`}
      role="status"
      aria-label={title}
    >
      <div className={`inline-flex items-center justify-center rounded-full bg-blue-50 mb-4 ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}>
        {icon}
      </div>
      <p className="text-gray-700 text-lg font-medium">{title}</p>
      {description && (
        <p className={`text-gray-500 mt-2 text-sm ${action ? 'mb-6' : ''}`}>{description}</p>
      )}
      {!description && action && <div className="mt-6" />}
      {action && <div className={description ? '' : 'mt-6'}>{action}</div>}
    </div>
  );
}
