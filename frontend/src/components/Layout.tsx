import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { removeToken, isAdmin, getUserRole } from '../services/auth';
import { authApi } from '../services/api';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/transactions', label: '交易记录', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { path: '/add', label: '添加交易', icon: 'M12 4v16m8-8H4' },
  { path: '/share', label: '分享图', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14' },
  { path: '/billing-cycles', label: '还款周期', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/analysis', label: 'AI分析', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
] as const;

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 先使用localStorage中的角色（快速显示）
    const cachedRole = getUserRole();
    if (cachedRole) {
      setUserRole(cachedRole);
      console.log('📦 [Layout] 使用缓存角色:', cachedRole);
    }
    
    // 只在有token时才从API获取最新角色
    const token = localStorage.getItem('token');
    if (!token) {
      // 没有token，不调用API
      return;
    }
    
    // 然后从API获取最新角色（确保准确性）
    const loadUserRole = async () => {
      try {
        const user = await authApi.getMe();
        // 如果返回null（token失效被静默处理），不更新角色
        if (!user || (user as any).silent || (user as any).isTokenExpired) {
          return;
        }
        console.log('🔍 [Layout] API返回用户信息:', user);
        if (user.role) {
          setUserRole(user.role);
          // 同时更新localStorage
          const { setUserRole: saveRole } = await import('../services/auth');
          saveRole(user.role);
          console.log('✅ [Layout] 用户角色已更新为:', user.role);
        } else {
          console.warn('⚠️ [Layout] 用户信息中没有角色字段');
        }
      } catch (error: any) {
        // 如果是静默处理的错误，不记录
        if (error?.silent || error?.isTokenExpired || error?.response?.data?.isTokenExpired) {
          return;
        }
        console.error('❌ [Layout] 获取用户角色失败:', error);
        // 如果API失败，保持使用localStorage中的角色
      }
    };
    
    loadUserRole();
  }, [location.pathname]); // 当路由变化时重新检查

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      removeToken();
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;
  
  // 检查是否为管理员：优先使用state中的角色，如果没有则检查localStorage
  const isUserAdmin = userRole === 'admin' || (userRole === null && isAdmin());
  
  // 调试日志 - 只在开发环境显示
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [Layout] 管理员权限检查:', {
        userRoleState: userRole,
        localStorageRole: getUserRole(),
        isAdminCheck: isAdmin(),
        isUserAdmin: isUserAdmin,
        willShowAdminMenu: isUserAdmin
      });
    }
  }, [userRole, isUserAdmin]);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const NavLinkContent = ({ label, icon }: { path: string; label: string; icon: string }) => (
    <>
      <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 app-shell">
      <nav className="bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 min-h-[3.5rem] sm:h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link
                to="/"
                className="flex items-center gap-2 text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"
              >
                <span className="text-xl sm:text-2xl">💰</span>
                <span className="hidden sm:inline">Counting Helper</span>
                <span className="sm:hidden">记账</span>
              </Link>
              {/* 桌面端导航 */}
              <div className="hidden md:flex space-x-1">
                {navItems.map(({ path, label, icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`nav-link ${isActive(path) ? 'active' : ''}`}
                  >
                    <NavLinkContent path={path} label={label} icon={icon} />
                  </Link>
                ))}
                {isUserAdmin && (
                  <>
                    <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} title="用户管理">
                      <NavLinkContent path="/admin" label="用户管理" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </Link>
                    <Link to="/performance" className={`nav-link ${isActive('/performance') ? 'active' : ''}`} title="性能监控">
                      <NavLinkContent path="/performance" label="性能" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 移动端：汉堡菜单 */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-gray-600 hover:bg-gray-100 touch-target"
                aria-label="打开菜单"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              {/* 桌面端：关于 + 退出 */}
              <Link to="/about" className={`hidden md:inline-flex nav-link ${isActive('/about') ? 'active' : ''} py-2`} title="关于">
                关于
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="fixed top-[3.5rem] sm:top-16 left-0 right-0 z-50 md:hidden bg-white border-b border-gray-200 shadow-xl rounded-b-2xl overflow-hidden safe-top max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="py-2">
              {navItems.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center px-5 py-4 text-base font-medium touch-target ${isActive(path) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <NavLinkContent path={path} label={label} icon={icon} />
                </Link>
              ))}
              {isUserAdmin && (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center px-5 py-4 text-base font-medium touch-target ${isActive('/admin') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <NavLinkContent path="/admin" label="用户管理" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </Link>
                  <Link
                    to="/performance"
                    className={`flex items-center px-5 py-4 text-base font-medium touch-target ${isActive('/performance') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <NavLinkContent path="/performance" label="性能监控" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </Link>
                </>
              )}
              <div className="border-t border-gray-100 my-2" />
              <Link
                to="/about"
                className={`flex items-center px-5 py-4 text-base font-medium touch-target ${isActive('/about') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <NavLinkContent path="/about" label="关于" icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center w-full px-5 py-4 text-base font-medium text-red-600 hover:bg-red-50 touch-target text-left"
              >
                <NavLinkContent path="/logout" label="退出登录" icon="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </button>
            </div>
          </div>
        </>
      )}

      <main className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 pb-20 md:pb-8 safe-bottom">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
