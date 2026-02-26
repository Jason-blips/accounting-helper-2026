import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ErrorBanner from '../components/ErrorBanner';
import { transactionApi, settingsApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getTodayInTimezone } from '../utils/format';

export default function AddTransaction() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'GBP',
    description: '',
    category: '',
    payment_method: '银行卡转账',
    transaction_type: '支出' as '收入' | '支出',
    created_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    let cancelled = false;
    settingsApi.getTimezone().then((res) => {
      if (!cancelled && res.timezone) {
        setFormData((prev) => ({ ...prev, created_at: getTodayInTimezone(res.timezone) }));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await transactionApi.create({
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      });
      toast('添加成功');
      navigate('/transactions');
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 400 && data != null) {
        console.error('[AddTransaction] 400 响应:', JSON.stringify(data));
      }
      const msg =
        data?.error ||
        (typeof data === 'object' && data !== null ? Object.values(data).join('；') : null) ||
        '创建失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">添加交易</h1>
          <p className="text-gray-600">记录您的收入和支出</p>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div>
            <label className="label">
              <span className="flex items-center space-x-2">
                <span>交易类型</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <select
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
              <label className="label">
                <span className="flex items-center space-x-2">
                  <span>金额</span>
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
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
              <label className="label">
                <span className="flex items-center space-x-2">
                  <span>货币</span>
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <select
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
            <label className="label">
              <span className="flex items-center space-x-2">
                <span>交易日期</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={formData.created_at}
              onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="flex items-center space-x-2">
                <span>支付方式</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <select
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
            <label className="label">分类</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field"
              placeholder="例如：餐饮、交通、购物"
            />
          </div>

          <div>
            <label className="label">描述</label>
            <textarea
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
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4"></div>
                  <span>创建中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>添加交易</span>
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
