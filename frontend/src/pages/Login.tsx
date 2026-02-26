import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setToken, setUserRole } from '../services/auth';

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
      if (response.user?.role) {
        setUserRole(response.user.role);
      } else {
        try {
          const userInfo = await authApi.getMe();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card p-8 space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-4">
              <span className="text-3xl">💰</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-gray-600">
              {isLogin ? '登录您的账户以继续' : '注册新账户开始使用'}
            </p>
          </div>

          {loginSuccessPrompt ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg text-center space-y-3">
                <div className="flex justify-center">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-lg">登录成功</p>
                <p className="text-sm text-green-700">
                  您可在浏览器弹窗中选择「保存密码」，便于下次登录；也可使用密码管理器保存。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoginSuccessPrompt(false);
                    navigate('/');
                  }}
                  className="btn-primary mt-2"
                >
                  进入主界面
                </button>
              </div>
            </div>
          ) : (
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            name={isLogin ? 'login' : 'register'}
            autoComplete="on"
          >
            {registerSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{registerSuccess}</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">用户名</label>
                <input
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
                <label className="label">密码</label>
                {!isLogin && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                    <span aria-hidden className="text-amber-600">🔐</span>
                    <span>推荐使用强密码（含大小写、数字、符号），可一键生成并保存到密码管理器</span>
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="input-field flex-1 min-w-0"
                    placeholder={isLogin ? '请输入密码' : '请设置密码（可点击右侧生成推荐密码）'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {!isLogin && (
                    <button
                      type="button"
                      onClick={handleUseRecommendedPassword}
                      className="btn-secondary whitespace-nowrap px-4 shrink-0"
                      title="生成并填充推荐强密码，并复制到剪贴板"
                    >
                      {passwordCopied ? '✓ 已复制' : '生成推荐密码'}
                    </button>
                  )}
                </div>
                {!isLogin && (
                  <p className="text-xs text-gray-500 mt-1">
                    生成后可保存到浏览器或密码管理器中，下次登录更方便
                  </p>
                )}
              </div>
              {!isLogin && (
                <div>
                  <label className="label">邮箱（可选）</label>
                  <input
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
                    <div className="spinner w-4 h-4"></div>
                    <span>处理中...</span>
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setRegisterSuccess('');
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
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
