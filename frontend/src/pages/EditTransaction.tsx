import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ErrorBanner from '../components/ErrorBanner';
import { transactionApi, categoriesApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { Transaction, UserCategory } from '../types';

export default function EditTransaction() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'GBP',
    description: '',
    category: '',
    payment_method: '银行卡转账',
    transaction_type: '支出' as '收入' | '支出',
    created_at: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const CATEGORY_OTHER = '__other__';
  const categorySelectValue = formData.category && categories.some((c) => c.name === formData.category)
    ? formData.category
    : CATEGORY_OTHER;

  useEffect(() => {
    loadTransaction();
  }, [id]);
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadTransaction = async () => {
    const numId = parseInt(id || '0', 10);
    if (!numId) {
      setError('无效的交易 ID');
      setLoading(false);
      return;
    }
    try {
      const found = await transactionApi.getById(numId);
      setTransaction(found);
      setFormData({
        amount: found.amount.toString(),
        currency: found.currency,
        description: found.description || '',
        category: found.category || '',
        payment_method: found.payment_method,
        transaction_type: found.transaction_type,
        created_at: found.created_at.split('T')[0],
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('交易不存在');
      } else if (err?.silent || err?.isTokenExpired) {
        return;
      } else {
        setError(err?.response?.data?.error || '加载失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await transactionApi.update(parseInt(id || '0'), {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      });
      toast('已保存');
      navigate('/transactions');
    } catch (err: any) {
      setError(err.response?.data?.error || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="spinner w-12 h-12"></div>
          <span className="ml-4 text-theme-muted text-lg">加载中...</span>
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20">
          <ErrorBanner message={error || '交易不存在'} className="mb-4" />
          <p className="text-center">
            <Link to="/transactions" className="link-theme hover:underline font-medium">返回交易记录</Link>
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">编辑交易</h1>
          <p className="text-gray-600">修改交易信息</p>
        </div>

        {error && (
          <div className="card p-4 border-theme" style={{ backgroundColor: 'var(--theme-surface-hover)' }}>
            <div className="flex items-center space-x-2 text-theme">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-8 space-y-6" aria-label="编辑交易">
          <div>
            <label className="label" htmlFor="edit-type">
              <span className="flex items-center space-x-2">
                <span>交易类型</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <select
              id="edit-type"
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as '收入' | '支出' })}
              className="input-field"
              required
            >
              <option value="收入">收入</option>
              <option value="支出">支出</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label" htmlFor="edit-amount">
                <span className="flex items-center space-x-2">
                  <span>金额</span>
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="edit-currency">
                <span className="flex items-center space-x-2">
                  <span>货币</span>
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                id="edit-currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input-field"
                required
              >
                <option value="GBP">GBP (£)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="edit-date">
              <span className="flex items-center space-x-2">
                <span>交易日期</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              id="edit-date"
              type="date"
              value={formData.created_at}
              onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="edit-payment">
              <span className="flex items-center space-x-2">
                <span>支付方式</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <select
              id="edit-payment"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="input-field"
              required
            >
              <option value="银行卡转账">银行卡转账</option>
              <option value="现金">现金</option>
              <option value="微信支付">微信支付</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="edit-category">分类</label>
            <select
              id="edit-category"
              value={categorySelectValue}
              onChange={(e) => {
                const v = e.target.value;
                setFormData({ ...formData, category: v === CATEGORY_OTHER ? '' : v });
              }}
              className="input-field"
            >
              <option value="">不选</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value={CATEGORY_OTHER}>其他（手动输入）</option>
            </select>
            {categorySelectValue === CATEGORY_OTHER && (
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field mt-2"
                placeholder="输入分类"
              />
            )}
          </div>

          <div>
            <label className="label" htmlFor="edit-description">描述</label>
            <textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field resize-none"
              rows={4}
              placeholder="例如：和朋友去Manchester餐厅吃饭，花费了50英镑"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="spinner w-4 h-4"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>保存更改</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
