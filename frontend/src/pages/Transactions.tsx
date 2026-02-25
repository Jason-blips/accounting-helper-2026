import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PullToRefresh from '../components/PullToRefresh';
import { transactionApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDateShort, formatDateWithWeekday } from '../utils/format';
import type { Transaction } from '../types';

export default function Transactions() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const urlFrom = searchParams.get('from') || '';
  const urlTo = searchParams.get('to') || '';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [filterDate, urlFrom, urlTo]);

  const loadTransactions = async () => {
    try {
      let data: Transaction[];
      if (urlFrom && urlTo) {
        data = await transactionApi.getAll(undefined, urlFrom, urlTo);
      } else {
        data = await transactionApi.getAll(filterDate || undefined);
      }
      // 检查是否有静默错误（接口可能返回错误对象）
      const raw = data as { silent?: boolean; isTokenExpired?: boolean } | Transaction[];
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw.silent || raw.isTokenExpired)) {
        return;
      }
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      // 如果是token失效，已经被拦截器静默处理
      if (error?.silent || error?.isTokenExpired) {
        return;
      }
      console.error('加载交易失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条交易吗？此操作无法撤销。')) {
      return;
    }

    setDeletingId(id);
    try {
      await transactionApi.delete(id);
      toast('已删除');
      loadTransactions();
    } catch (error: any) {
      // 如果是token失效，已经被拦截器静默处理
      if (error?.silent || error?.isTokenExpired) {
        return;
      }
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  // 按日期分组 - 统一处理日期格式，确保同一天的交易合并
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    let dateStr = (transaction.created_at || '').trim();
    if (!dateStr) return groups;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          dateStr = match[1];
        } else {
          return groups;
        }
      } else {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
    } catch {
      dateStr = dateStr.substring(0, 10);
    }

    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return groups;
    
    // 使用标准化的日期作为键
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const calculateDayStats = (dayTransactions: Transaction[]) => {
    const income = dayTransactions
      .filter(t => t.transaction_type === '收入')
      .reduce((sum, t) => sum + t.amount_in_gbp, 0);
    const expense = dayTransactions
      .filter(t => t.transaction_type === '支出')
      .reduce((sum, t) => sum + t.amount_in_gbp, 0);
    return { income, expense, balance: income - expense };
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

  return (
    <Layout>
      <PullToRefresh onRefresh={loadTransactions}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">交易记录</h1>
            <p className="text-gray-600">查看和管理您的所有交易</p>
          </div>
          <Link
            to="/add"
            className="btn-primary flex items-center space-x-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>添加交易</span>
          </Link>
        </div>

        <div className="card p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{urlFrom && urlTo ? '周期范围：' : '筛选日期：'}</span>
            </label>
            <div className="flex items-center space-x-2 flex-1 flex-wrap">
              {urlFrom && urlTo ? (
                <>
                  <span className="text-gray-700">{urlFrom} 至 {urlTo}</span>
                  <Link to="/transactions" className="btn-secondary text-sm px-3 py-2">清除</Link>
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="input-field flex-1 max-w-xs"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="btn-secondary text-sm px-3 py-2"
                    >
                      清除
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-4">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 text-lg font-medium">还没有交易记录</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">记一笔收入或支出，开始打理你的账本</p>
            <Link to="/add" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              记一笔
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, dayTransactions]) => {
                const dayStats = calculateDayStats(dayTransactions);
                return (
                  <div key={date} className="card overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-5 text-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">{formatDateShort(date)}</h2>
                              <div className="text-sm text-white/80 mt-0.5">{formatDateWithWeekday(date).split(' ')[1]}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-white/90">
                            <div className="px-2 py-1 bg-white/20 rounded-md backdrop-blur-sm">
                              <span className="font-semibold">{dayTransactions.length}</span>
                              <span className="ml-1">笔开销</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
                            <div className="text-xs font-medium text-white/80 mb-1">收入</div>
                            <div className="text-lg font-bold text-green-200">
                              {formatCurrency(dayStats.income, 'GBP')}
                            </div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
                            <div className="text-xs font-medium text-white/80 mb-1">支出</div>
                            <div className="text-lg font-bold text-red-200">
                              {formatCurrency(dayStats.expense, 'GBP')}
                            </div>
                          </div>
                          <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20 ${
                            dayStats.balance >= 0 ? 'ring-2 ring-green-300' : 'ring-2 ring-red-300'
                          }`}>
                            <div className="text-xs font-medium text-white/80 mb-1">余额</div>
                            <div className={`text-lg font-bold ${
                              dayStats.balance >= 0 ? 'text-green-200' : 'text-red-200'
                            }`}>
                              {formatCurrency(dayStats.balance, 'GBP')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-3 bg-gray-50/50">
                      {dayTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-white rounded-xl hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-blue-300"
                        >
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                transaction.transaction_type === '收入'
                                  ? 'bg-gradient-to-br from-green-400 to-green-600'
                                  : 'bg-gradient-to-br from-red-400 to-red-600'
                              }`}>
                                {transaction.transaction_type === '收入' ? (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                    transaction.transaction_type === '收入'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {transaction.transaction_type}
                                  </span>
                                  <span className="text-xl font-bold text-gray-900">
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                  </span>
                                </div>
                                {transaction.description && (
                                  <div className="text-sm text-gray-700 font-medium truncate">
                                    {transaction.description}
                                  </div>
                                )}
                                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-2">
                                  <span className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    <span>{transaction.payment_method}</span>
                                  </span>
                                  {transaction.category && (
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                                      {transaction.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Link
                              to={`/edit/${transaction.id}`}
                              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>编辑</span>
                            </Link>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              disabled={deletingId === transaction.id}
                              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === transaction.id ? (
                                <>
                                  <div className="spinner w-4 h-4 border-red-600"></div>
                                  <span>删除中...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>删除</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}
