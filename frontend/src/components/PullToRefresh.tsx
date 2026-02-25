import { useRef, useState, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    const y = e.touches[0].clientY;
    const diff = y - startY.current;
    if (diff > 30 && window.scrollY <= 5) {
      setPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || refreshing) return;
    if (pulling) {
      setPulling(false);
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPulling(false)}
    >
      {(pulling || refreshing) && (
        <div className="flex justify-center py-3 text-gray-500 text-sm">
          {refreshing ? (
            <span className="flex items-center gap-2">
              <span className="spinner w-4 h-4 border-2" /> 刷新中...
            </span>
          ) : (
            <span>松开刷新</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
