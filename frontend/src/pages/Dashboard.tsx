import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import PullToRefresh from '../components/PullToRefresh';
import { statsApi, transactionApi, adminApi, authApi } from '../services/api';
import { formatCurrency } from '../utils/format';
import { isAdmin } from '../services/auth';
import type { Stats, Transaction } from '../types';

interface ChartData {
  date: string;
  收入: number;
  支出: number;
  余额: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    // 检查管理员权限
    const checkAdmin = async () => {
      try {
        const user = await authApi.getMe();
        // 如果返回null（token失效被静默处理），不更新
        if (!user || (user as any).silent || (user as any).isTokenExpired) {
          return;
        }
        const isAdminUser = user.role === 'admin';
        setIsUserAdmin(isAdminUser);
        if (isAdminUser) {
          console.log('✅ [Dashboard] 检测到管理员权限');
        }
      } catch (error: any) {
        // 如果是token失效，已经被拦截器静默处理
        if (error?.silent || error?.isTokenExpired) {
          return;
        }
        // 如果API失败，使用localStorage检查
        setIsUserAdmin(isAdmin());
      }
    };
    
    checkAdmin();
    loadData();
  }, []);

  const loadData = async () => {
    setLoadError(null);
    try {
      const promises: Promise<any>[] = [
        statsApi.getSummary(),
        transactionApi.getAll()
      ];
      
      // 如果是管理员，同时加载管理员统计
      if (isUserAdmin) {
        promises.push(adminApi.getStats());
      }
      
      const results = await Promise.all(promises);
      
      // 检查是否有静默错误
      if (results.some(r => r?.silent || r?.isTokenExpired)) {
        return; // token失效，会被重定向，不需要继续处理
      }
      
      setStats(results[0]);
      processChartData(results[1]);
      
      if (isUserAdmin && results[2]) {
        setAdminStats(results[2]);
      }
    } catch (error: any) {
      // 如果是token失效，已经被拦截器静默处理
      if (error?.silent || error?.isTokenExpired) {
        return;
      }
      console.error('加载数据失败:', error);
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      const status = error?.response?.status;
      if (status === 500) {
        setLoadError(msg || '服务器错误，可能是数据库异常，请查看后端控制台日志');
      } else if (!error?.response) {
        setLoadError('网络异常，请检查后端是否已启动（如 start.bat）');
      } else {
        setLoadError(msg || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (transactions: Transaction[]) => {
    // 按日期分组
    const grouped = transactions.reduce((groups, transaction) => {
      let dateStr = transaction.created_at || '';
      
      // 统一提取日期
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      } else if (dateStr.includes(' ')) {
        dateStr = dateStr.split(' ')[0];
      } else {
        dateStr = dateStr.substring(0, 10);
      }
      
      const date = dateStr.substring(0, 10);
      
      if (!groups[date]) {
        groups[date] = { income: 0, expense: 0 };
      }
      
      if (transaction.transaction_type === '收入') {
        groups[date].income += transaction.amount_in_gbp;
      } else {
        groups[date].expense += transaction.amount_in_gbp;
      }
      
      return groups;
    }, {} as Record<string, { income: number; expense: number }>);

    // 转换为图表数据格式并按日期排序
    const chartDataArray: ChartData[] = Object.entries(grouped)
      .map(([date, data]) => ({
        date: formatDateForChart(date),
        收入: data.income,
        支出: data.expense,
        余额: data.income - data.expense
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 如果数据点少于7个，显示所有；否则显示最近30天
    if (chartDataArray.length > 30) {
      setChartData(chartDataArray.slice(-30));
    } else {
      setChartData(chartDataArray);
    }
  };

  const formatDateForChart = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    } catch {
      return dateStr.substring(5, 10).replace('-', '/');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="spinner w-12 h-12"></div>
          <span className="ml-4 text-gray-600 text-lg">加载中...</span>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 px-4">
          <ErrorBanner message={loadError || '加载失败'} className="mb-4" />
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setLoading(true); setLoadError(null); loadData(); }}
              className="btn-primary"
            >
              重试
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={loadData}>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex flex-wrap items-center gap-2 sm:space-x-3">
              <span>财务概览</span>
              {isUserAdmin && (
                <span className="px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                  管理员
                </span>
              )}
            </h1>
            <p className="text-gray-600">查看您的收入和支出统计</p>
          </div>
          <Link
            to="/share"
            className="btn-secondary flex items-center justify-center gap-2 self-start sm:self-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
            生成分享图
          </Link>
        </div>

        {/* 管理员快速访问卡片 */}
        {isUserAdmin && (
          <div className="card p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>管理员控制台</span>
                </h2>
                <p className="text-gray-700 mb-4">管理系统用户和查看系统统计信息</p>
                {adminStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/80 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-semibold text-gray-500 mb-1">总用户数</div>
                      <div className="text-2xl font-bold text-purple-600">{adminStats.total_users}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-semibold text-gray-500 mb-1">管理员</div>
                      <div className="text-2xl font-bold text-purple-600">{adminStats.admin_count}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-semibold text-gray-500 mb-1">普通用户</div>
                      <div className="text-2xl font-bold text-green-600">{adminStats.user_count}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-semibold text-gray-500 mb-1">总交易数</div>
                      <div className="text-2xl font-bold text-blue-600">{adminStats.total_transactions}</div>
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/admin"
                className="btn-primary flex items-center space-x-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>进入用户管理</span>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card income">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">总收入</div>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatCurrency(parseFloat(stats.income), 'GBP')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {stats.incomeCount} 笔收入
            </div>
          </div>

          <div className="stat-card expense">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">总支出</div>
            <div className="text-4xl font-bold text-red-600 mb-2">
              {formatCurrency(parseFloat(stats.expense), 'GBP')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {stats.expenseCount} 笔支出
            </div>
          </div>

          <div className="stat-card balance">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                parseFloat(stats.balance) >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  parseFloat(stats.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">余额</div>
            <div className={`text-4xl font-bold mb-2 ${
              parseFloat(stats.balance) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(parseFloat(stats.balance), 'GBP')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {parseFloat(stats.balance) >= 0 ? '财务状况良好' : '需要关注支出'}
            </div>
          </div>
        </div>

        {/* 收入支出趋势图表 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center space-x-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>收支趋势</span>
              </h2>
              <p className="text-gray-600 text-sm mt-1">查看您的收入和支出变化趋势</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700">收入</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-red-700">支出</span>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `£${value.toFixed(0)}`}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px'
                  }}
                  formatter={(value: number) => formatCurrency(value, 'GBP')}
                  labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="收入" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorIncome)"
                />
                <Area 
                  type="monotone" 
                  dataKey="支出" 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px]">
              <EmptyState
                title="暂无数据"
                description="添加交易后即可查看趋势图表"
                action={
                  <Link to="/add" className="btn-primary inline-flex items-center gap-2 text-sm">记一笔</Link>
                }
                compact
                icon={
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>
          )}
        </div>

        {/* 余额趋势图表 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center space-x-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>余额趋势</span>
              </h2>
              <p className="text-gray-600 text-sm mt-1">查看您的账户余额变化</p>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `£${value.toFixed(0)}`}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px'
                  }}
                  formatter={(value: number) => formatCurrency(value, 'GBP')}
                  labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="余额" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <EmptyState
                title="暂无数据"
                description="添加交易后即可查看余额趋势"
                action={
                  <Link to="/add" className="btn-primary inline-flex items-center gap-2 text-sm">记一笔</Link>
                }
                compact
                icon={
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
            </div>
          )}
        </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}
