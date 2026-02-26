import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsApi, transactionApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/London', label: '英国时间' },
  { value: 'Asia/Shanghai', label: '北京时间' },
];

export default function Settings() {
  const toast = useToast();
  const { themeId, themes, setThemeId } = useTheme();
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>设置</h1>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>还款周期、时区等偏好设置</p>
        </div>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="spinner w-10 h-10 mx-auto"></div>
            <p className="mt-3" style={{ color: 'var(--theme-text-muted)' }}>加载中...</p>
          </div>
        ) : (
          <div className="card p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                主题
              </h2>
              <p className="text-sm mb-3" style={{ color: 'var(--theme-text-muted)' }}>选择一套完整配色，风格参考 VS Code 内置主题</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    className="flex items-center gap-3 w-full rounded-lg border-2 p-3 text-left transition-all hover:opacity-90"
                    style={{
                      borderColor: themeId === t.id ? t.palette.primary : 'var(--theme-border)',
                      backgroundColor: 'var(--theme-surface)',
                    }}
                    aria-label={`主题：${t.name}`}
                    aria-pressed={themeId === t.id}
                  >
                    <span
                      className="w-10 h-10 rounded-lg shrink-0 flex flex-col overflow-hidden"
                      aria-hidden
                    >
                      <span className="h-2 flex-1 w-full" style={{ backgroundColor: t.palette.bg }} />
                      <span className="h-2 flex-1 w-full" style={{ backgroundColor: t.palette.surface }} />
                      <span className="h-2 flex-1 w-full" style={{ backgroundColor: t.palette.primary }} />
                    </span>
                    <span className="font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                      {t.name}
                    </span>
                    {themeId === t.id && (
                      <svg className="w-5 h-5 ml-auto shrink-0" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                还款周期
              </h2>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>还款日（每月几号）</label>
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
                  <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                    {repaymentDay === 1
                      ? '周期从每月 1 号至当月最后一天'
                      : `周期从本月 ${repaymentDay} 号至下月 ${repaymentDay === 31 ? '最后一天' : `${repaymentDay - 1} 号`}`}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>影响「今天」的日期与还款周期计算</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                数据导出
              </h2>
              <p className="text-sm text-gray-500 mb-3">将交易记录导出为 CSV 或 Excel，可选日期范围（留空则导出全部）</p>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="export-format" style={{ color: 'var(--theme-text)' }}>格式</label>
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
                    <label className="block text-sm font-medium mb-1" htmlFor="export-to" style={{ color: 'var(--theme-text)' }}>结束日期</label>
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
