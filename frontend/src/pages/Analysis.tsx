import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { analysisApi } from '../services/api';

export default function Analysis() {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'day' | '3days' | 'week' | 'month' | 'all'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await analysisApi.analyze(period);
      // 检查是否有静默错误
      if ((response as { silent?: boolean; isTokenExpired?: boolean })?.silent || (response as { isTokenExpired?: boolean })?.isTokenExpired) {
        return; // token失效，会被重定向，不需要继续处理
      }
      setAnalysis(response.analysis);
      if (response.error) {
        setError(response.error);
      }
    } catch (err: any) {
      // 如果是token失效，已经被拦截器静默处理，不需要显示错误
      if (err?.silent || err?.isTokenExpired) {
        return;
      }
      setError(err.response?.data?.error || '分析失败，请重试');
      setAnalysis('');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    await loadAnalysis();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AI分析</h1>
            <p className="text-gray-600">智能分析您的财务数据并提供建议</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as any);
                setTimeout(() => loadAnalysis(), 100);
              }}
              className="input-field"
            >
              <option value="day">今天</option>
              <option value="3days">最近3天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="all">全部</option>
            </select>
            <button
              onClick={handleReanalyze}
              disabled={loading}
              className="btn-primary flex items-center space-x-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4"></div>
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>重新分析</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="card p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-800 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && !analysis ? (
          <div className="card p-12 text-center">
            <div className="spinner w-16 h-16 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">AI正在分析您的财务数据...</p>
            <p className="text-gray-500 text-sm mt-2">这可能需要几秒钟</p>
          </div>
        ) : analysis ? (
          <div className="card p-8">
            <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI分析报告</h2>
                <p className="text-sm text-gray-500">基于您的交易数据生成</p>
              </div>
            </div>
            <div className="prose max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
              {analysis}
            </div>
          </div>
        ) : (
          <EmptyState
            title="暂无分析结果"
            description="点击「重新分析」按钮生成分析报告"
          />
        )}
      </div>
    </Layout>
  );
}
