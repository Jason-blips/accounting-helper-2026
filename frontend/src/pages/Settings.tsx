import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsApi, transactionApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/London', label: '英国时间' },
  { value: 'Asia/Shanghai', label: '北京时间' },
];

export default function Settings() {
  const toast = useToast();
  const [repaymentDay, setRepaymentDay] = useState(15);
  const [timezone, setTimezone] = useState('Europe/London');
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dayRes, tzRes] = await Promise.all([
          settingsApi.getRepaymentDay(),
          settingsApi.getTimezone(),
        ]);
        if (!cancelled) {
          setRepaymentDay(dayRes.repaymentDay);
          setTimezone(tzRes.timezone || 'Europe/London');
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveRepaymentDay = async (day: number) => {
    const clamped = Math.max(1, Math.min(31, day));
    try {
      await settingsApi.setRepaymentDay(clamped);
      setRepaymentDay(clamped);
      toast('还款日已保存');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err.response?.data?.error || '保存失败');
    }
  };

  const handleSaveTimezone = async (tz: string) => {
    try {
      await settingsApi.setTimezone(tz);
      setTimezone(tz);
      toast('时区已保存');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err.response?.data?.error || '保存失败');
    }
  };

  const handleExport = async () => {
    const from = exportFrom.trim() || undefined;
    const to = exportTo.trim() || undefined;
    if ((from && !to) || (!from && to)) {
      toast('请同时填写开始日期和结束日期，或都留空导出全部');
      return;
    }
    setExporting(true);
    try {
      await transactionApi.export(exportFormat, from, to);
      toast('导出成功，请查看下载');
    } catch (e: unknown) {
      const err = e as Error;
      toast(err.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">设置</h1>
          <p className="text-gray-600 text-sm">还款周期、时区等偏好设置</p>
        </div>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="spinner w-10 h-10 mx-auto border-blue-600"></div>
            <p className="text-gray-500 mt-3">加载中...</p>
          </div>
        ) : (
          <div className="card p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                还款周期
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">还款日（每月几号）</label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={repaymentDay}
                    onChange={(e) => handleSaveRepaymentDay(parseInt(e.target.value, 10))}
                    className="input-field max-w-[140px]"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        每月 {d} 号
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500">
                    {repaymentDay === 1
                      ? '周期从每月 1 号至当月最后一天'
                      : `周期从本月 ${repaymentDay} 号至下月 ${repaymentDay === 31 ? '最后一天' : `${repaymentDay - 1} 号`}`}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                时区
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前时区</label>
                <select
                  value={timezone}
                  onChange={(e) => handleSaveTimezone(e.target.value)}
                  className="input-field max-w-[180px]"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">影响「今天」的日期与还款周期计算</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                数据导出
              </h2>
              <p className="text-sm text-gray-500 mb-3">将交易记录导出为 CSV 或 Excel，可选日期范围（留空则导出全部）</p>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="export-format">格式</label>
                    <select
                      id="export-format"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                      className="input-field max-w-[140px]"
                    >
                      <option value="csv">CSV</option>
                      <option value="excel">Excel (.xlsx)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="export-from">开始日期</label>
                    <input
                      id="export-from"
                      type="date"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                      className="input-field max-w-[160px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="export-to">结束日期</label>
                    <input
                      id="export-to"
                      type="date"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                      className="input-field max-w-[160px]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn-primary"
                  aria-label="导出交易数据"
                >
                  {exporting ? '导出中...' : '导出'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
