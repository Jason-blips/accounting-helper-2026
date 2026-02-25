import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { performanceApi } from '../services/api';
import { isAdmin } from '../services/auth';

interface PerformanceStats {
  uptime: number;
  totalRequests: number;
  activeRequests: number;
  maxConcurrent: number;
  errors: number;
  errorRate: string;
  avgResponseTime: string;
  p95ResponseTime: string;
  p99ResponseTime: string;
  database: {
    activeConnections: number;
    queueLength: number;
    maxConcurrentQueries: number;
  };
  requestsPerSecond: string;
}

export default function Performance() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      setLoading(false);
      return;
    }

    loadStats();
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadStats, 2000); // 每2秒刷新
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadStats = async () => {
    try {
      const data = await performanceApi.getStats();
      // 检查是否有静默错误
      if (data?.silent || data?.isTokenExpired) {
        return; // token失效，会被重定向，不需要继续处理
      }
      setStats(data);
    } catch (error: any) {
      // 如果是token失效，已经被拦截器静默处理
      if (error?.silent || error?.isTokenExpired) {
        return;
      }
      console.error('加载性能数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟 ${secs}秒`;
    if (minutes > 0) return `${minutes}分钟 ${secs}秒`;
    return `${secs}秒`;
  };

  if (!isAdmin()) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 text-lg font-medium">需要管理员权限</p>
        </div>
      </Layout>
    );
  }

  if (loading && !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="spinner w-12 h-12"></div>
          <span className="ml-4 text-gray-600 text-lg">加载中...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>性能监控</span>
            </h1>
            <p className="text-gray-600">实时监控服务器性能和并发状态</p>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">自动刷新</span>
          </label>
        </div>

        {stats && (
          <>
            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="stat-card p-6">
                <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">运行时间</div>
                <div className="text-3xl font-bold text-gray-900">{formatUptime(stats.uptime)}</div>
              </div>
              <div className="stat-card p-6">
                <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">总请求数</div>
                <div className="text-3xl font-bold text-blue-600">{stats.totalRequests.toLocaleString()}</div>
              </div>
              <div className="stat-card p-6">
                <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">当前并发</div>
                <div className="text-3xl font-bold text-green-600">{stats.activeRequests}</div>
                <div className="text-sm text-gray-500 mt-1">峰值: {stats.maxConcurrent}</div>
              </div>
              <div className="stat-card p-6">
                <div className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">请求/秒</div>
                <div className="text-3xl font-bold text-purple-600">{stats.requestsPerSecond}</div>
              </div>
            </div>

            {/* 响应时间统计 */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">响应时间统计</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-600 mb-1">平均响应时间</div>
                  <div className="text-2xl font-bold text-blue-700">{stats.avgResponseTime}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-xs font-semibold text-green-600 mb-1">P50 (中位数)</div>
                  <div className="text-2xl font-bold text-green-700">{stats.avgResponseTime}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-xs font-semibold text-yellow-600 mb-1">P95</div>
                  <div className="text-2xl font-bold text-yellow-700">{stats.p95ResponseTime}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-xs font-semibold text-red-600 mb-1">P99</div>
                  <div className="text-2xl font-bold text-red-700">{stats.p99ResponseTime}</div>
                </div>
              </div>
            </div>

            {/* 错误统计 */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">错误统计</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-xs font-semibold text-red-600 mb-1">错误总数</div>
                  <div className="text-3xl font-bold text-red-700">{stats.errors}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-xs font-semibold text-orange-600 mb-1">错误率</div>
                  <div className="text-3xl font-bold text-orange-700">{stats.errorRate}</div>
                </div>
              </div>
            </div>

            {/* 数据库状态 */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">数据库状态</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">活跃连接</div>
                  <div className="text-2xl font-bold text-gray-700">{stats.database.activeConnections}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-600 mb-1">队列长度</div>
                  <div className="text-2xl font-bold text-blue-700">{stats.database.queueLength}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-xs font-semibold text-green-600 mb-1">最大并发查询</div>
                  <div className="text-2xl font-bold text-green-700">{stats.database.maxConcurrentQueries}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
