import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorBanner from '../components/ErrorBanner';
import { authApi } from '../services/api';
import { setToken, setUserRole, setUsername as saveUsernameToStorage } from '../services/auth';

/** 生成推荐的长难复杂密码（含大小写、数字、符号） */
function generateStrongPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = lower + upper + digits + symbols;
  const pick = (s: string, n: number) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  return [
    pick(lower, 4),
    pick(upper, 3),
    pick(digits, 3),
    pick(symbols, 2),
    pick(all, 4),
  ]
    .join('')
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  /** 注册成功后提示，并进入登录流程（不直接进主界面） */
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  /** 登录成功后是否显示「是否保存密码」提示（再进入主界面） */
  const [loginSuccessPrompt, setLoginSuccessPrompt] = useState(false);
  const navigate = useNavigate();

  const handleUseRecommendedPassword = () => {
    const pwd = generateStrongPassword();
    setPassword(pwd);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd).then(() => {
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRegisterSuccess('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authApi.login(username, password);
      } else {
        response = await authApi.register(username, password, email);
        const token = response?.token;
        if (!token) {
          setError('注册失败');
          return;
        }
        // 注册成功：不直接进主界面，显示成功提示并切换到登录流程，让用户再登录一次
        setRegisterSuccess('注册成功！请使用下方账号登录。');
        setIsLogin(true);
        setPassword('');
        setLoading(false);
        return;
      }

      const token = response?.token;
      if (!token) {
        setError('登录失败');
        return;
      }
      setToken(token);
      if (response.user?.username) saveUsernameToStorage(response.user.username);
      if (response.user?.role) {
        setUserRole(response.user.role);
      } else {
        try {
          const userInfo = await authApi.getMe();
          if (userInfo?.username) saveUsernameToStorage(userInfo.username);
          if (userInfo?.role) setUserRole(userInfo.role);
        } catch {
          // 忽略，角色可选
        }
      }
      setLoginSuccessPrompt(true);
    } catch (err: any) {
      const raw = err.response?.data?.error;
      const safe = raw === '用户名已存在' || raw === '用户名或密码错误'
        ? raw
        : (isLogin ? '登录失败' : '注册失败');
      setError(safe);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-8 sm:py-12 px-4 sm:px-6">
      {/* 背景：与主题一致的渐变 + 柔和光晕，让卡片有“落点” */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(160deg, var(--primary-50) 0%, var(--theme-surface) 45%, var(--theme-bg) 100%)',
        }}
      />
      <div
        className="absolute top-1/4 -left-1/4 w-[80%] max-w-md h-64 rounded-full opacity-40 -z-10 blur-3xl"
        style={{ background: 'var(--theme-primary)' }}
      />
      <div
        className="absolute bottom-1/4 -right-1/4 w-[60%] max-w-sm h-48 rounded-full opacity-30 -z-10 blur-3xl"
        style={{ background: 'var(--theme-primary)' }}
      />

      <div className="max-w-md w-full page-content">
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-hover) 100%)',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
            }}
          >
            <span className="text-2xl sm:text-3xl" aria-hidden>💰</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme tracking-tight mb-1.5">
            欢迎使用 Tally Drop 落记
          </h1>
          <p className="text-sm sm:text-base text-theme-muted">
            Track your income and expenses—simply.
          </p>
        </div>

        <div className="card card-flat p-6 sm:p-8 space-y-6 sm:space-y-8">
          {loginSuccessPrompt ? (
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full"
                style={{ backgroundColor: 'var(--theme-primary-soft)' }}
              >
                <svg className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-theme text-lg">登录成功</p>
              <p className="text-sm text-theme-muted">可保存到浏览器或密码管理器，便于下次登录</p>
              <button
                type="button"
                onClick={() => {
                  setLoginSuccessPrompt(false);
                  navigate('/');
                }}
                className="btn-primary w-full sm:w-auto"
              >
                进入主界面
              </button>
            </div>
          ) : (
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            name={isLogin ? 'login' : 'register'}
            autoComplete="on"
            aria-label={isLogin ? '登录' : '注册'}
          >
            {registerSuccess && (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--theme-primary-soft)', color: 'var(--theme-primary)' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{registerSuccess}</span>
              </div>
            )}
            {error && <ErrorBanner message={error} />}

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="login-username">用户名</label>
                <input
                  id="login-username"
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  className="input-field"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="login-password">密码</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="input-field flex-1 min-w-0"
                    placeholder={isLogin ? '请输入密码' : '请设置密码'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {!isLogin && (
                    <button
                      type="button"
                      onClick={handleUseRecommendedPassword}
                      className="btn-secondary whitespace-nowrap px-3 sm:px-4 shrink-0 text-sm"
                      title="生成强密码并复制"
                      aria-label="生成强密码并复制"
                    >
                      {passwordCopied ? '✓' : '生成'}
                    </button>
                  )}
                </div>
              </div>
              {!isLogin && (
                <div>
                  <label className="label" htmlFor="login-email">邮箱（选填）</label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="input-field"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="spinner w-4 h-4" aria-hidden />
                    <span>{isLogin ? '登录中...' : '注册中...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? '登录' : '注册'}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-4 mt-2 border-t border-theme">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setRegisterSuccess('');
                }}
                className="text-sm font-medium link-theme py-2 px-3 rounded-xl hover:bg-theme-surface-hover transition-colors duration-200"
              >
                {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
