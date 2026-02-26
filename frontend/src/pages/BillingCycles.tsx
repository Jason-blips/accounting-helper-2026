import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { billingCyclesApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import type { BillingCycleDto } from '../types';

function cycleLabel(c: BillingCycleDto): string {
  const s = new Date(c.startDate + 'T12:00:00');
  const e = new Date(c.endDate + 'T12:00:00');
  return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`;
}

export default function BillingCycles() {
  const toast = useToast();
  const [cycles, setCycles] = useState<BillingCycleDto[]>([]);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [editingBudget, setEditingBudget] = useState<BillingCycleDto | null>(null);
  const [expectedIncome, setExpectedIncome] = useState<string>('');
  const [expectedExpense, setExpectedExpense] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const to = new Date();
    const fromStr = '2025-12-01';
    const toStr = to.toISOString().slice(0, 10);
    (async () => {
      try {
        const list = await billingCyclesApi.list(fromStr, toStr);
        if (!cancelled) setCycles(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setCycles([]);
      } finally {
        if (!cancelled) setLoadingCycles(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openBudgetModal = (c: BillingCycleDto) => {
    setEditingBudget(c);
    setExpectedIncome(c.expectedIncome != null ? String(c.expectedIncome) : '');
    setExpectedExpense(c.expectedExpense != null ? String(c.expectedExpense) : '');
  };

  const saveBudget = async () => {
    if (!editingBudget) return;
    setSavingBudget(true);
    try {
      await billingCyclesApi.setBudget(
        editingBudget.startDate,
        expectedIncome === '' ? null : parseFloat(expectedIncome) || null,
        expectedExpense === '' ? null : parseFloat(expectedExpense) || null
      );
      setCycles((prev) =>
        prev.map((c) =>
          c.startDate === editingBudget.startDate
            ? {
                ...c,
                expectedIncome: expectedIncome === '' ? null : parseFloat(expectedIncome) || null,
                expectedExpense: expectedExpense === '' ? null : parseFloat(expectedExpense) || null,
              }
            : c
        )
      );
      setEditingBudget(null);
      toast('预期收支已保存');
    } catch (e) {
      console.error(e);
      toast('保存失败');
    } finally {
      setSavingBudget(false);
    }
  };

  const shareUrl = (c: BillingCycleDto) =>
    `/share?period=cycle&from=${c.startDate}&to=${c.endDate}`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">还款周期</h1>
          <p className="text-gray-600 text-sm">
            按还款日划分周期，查看每期收支并设置预期，合理分配开销
          </p>
          <p className="text-sm text-gray-500 mt-2">
            还款日、时区等请在
            <Link to="/settings" className="text-blue-600 hover:underline font-medium ml-1">设置</Link>
            中修改
          </p>
        </div>

        {loadingCycles ? (
          <div className="card p-12 text-center">
            <div className="spinner w-10 h-10 mx-auto border-blue-600"></div>
            <p className="text-gray-500 mt-3">加载周期...</p>
          </div>
        ) : cycles.length === 0 ? (
          <EmptyState
            title="暂无周期数据"
            description={
              <>
                请先在<Link to="/settings" className="text-blue-600 hover:underline font-medium">设置</Link>中配置还款日，并确保有交易记录
              </>
            }
          />
        ) : (
          <div className="space-y-4">
            {cycles.map((c) => (
              <div
                key={c.startDate}
                className="card p-4 sm:p-5 border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{cycleLabel(c)}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/transactions?from=${c.startDate}&to=${c.endDate}`}
                      className="btn-secondary text-sm py-2 px-3"
                    >
                      查看明细
                    </Link>
                    <button
                      type="button"
                      onClick={() => openBudgetModal(c)}
                      className="btn-secondary text-sm py-2 px-3"
                    >
                      设置预期
                    </button>
                    <Link
                      to={shareUrl(c)}
                      className="btn-primary text-sm py-2 px-3 inline-flex items-center gap-1"
                    >
                      生成分享图
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">收入</span>
                    <div className="font-semibold text-green-600">{formatCurrency(c.income, 'GBP')}</div>
                    <span className="text-gray-400">{c.incomeCount} 笔</span>
                  </div>
                  <div>
                    <span className="text-gray-500">支出</span>
                    <div className="font-semibold text-red-600">{formatCurrency(c.expense, 'GBP')}</div>
                    <span className="text-gray-400">{c.expenseCount} 笔</span>
                  </div>
                  <div>
                    <span className="text-gray-500">结余</span>
                    <div className={`font-semibold ${c.balance >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatCurrency(c.balance, 'GBP')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">预期</span>
                    {(c.expectedIncome != null || c.expectedExpense != null) ? (
                      <div className="text-amber-700 text-xs">
                        {c.expectedIncome != null && `收 ${formatCurrency(c.expectedIncome, 'GBP')} `}
                        {c.expectedExpense != null && `支 ${formatCurrency(c.expectedExpense, 'GBP')}`}
                      </div>
                    ) : (
                      <span className="text-gray-400">未设置</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">设置预期收支 · {cycleLabel(editingBudget)}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预期收入 (GBP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedIncome}
                  onChange={(e) => setExpectedIncome(e.target.value)}
                  className="input-field"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预期支出 (GBP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedExpense}
                  onChange={(e) => setExpectedExpense(e.target.value)}
                  className="input-field"
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveBudget}
                disabled={savingBudget}
                className="btn-primary flex-1"
              >
                {savingBudget ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
