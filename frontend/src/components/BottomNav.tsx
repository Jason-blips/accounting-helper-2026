import { Link, useLocation } from 'react-router-dom';

const items = [
  { path: '/', label: '概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/transactions', label: '交易', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { path: '/add', label: '记一笔', icon: 'M12 4v16m8-8H4', primary: true },
  { path: '/analysis', label: '分析', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t safe-bottom"
      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      aria-label="主导航"
    >
      <div className="flex justify-around items-center h-16">
        {items.map(({ path, label, icon, primary }) => {
          const active = location.pathname === path;
          const isPrimary = primary === true;
          if (isPrimary) {
            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center justify-center flex-1 h-full min-w-0 touch-target"
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-full transition-colors text-white"
                  style={
                    active
                      ? { backgroundColor: 'var(--theme-primary)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)' }
                      : { backgroundColor: 'var(--theme-primary-soft)', color: 'var(--theme-primary)' }
                  }
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </span>
                <span
                  className="text-xs mt-1 font-medium truncate max-w-full px-1"
                  style={active ? { color: 'var(--theme-primary)' } : { color: 'var(--theme-text-muted)' }}
                >
                  {label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center flex-1 h-full min-w-0 touch-target"
              style={{ color: active ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }}
              aria-current={active ? 'page' : undefined}
            >
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="text-xs mt-0.5 truncate max-w-full px-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
