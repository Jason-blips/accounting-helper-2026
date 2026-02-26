import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsApi, transactionApi, categoriesApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import type { UserCategory } from '../types';

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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dayRes, tzRes, cats] = await Promise.all([
          settingsApi.getRepaymentDay(),
          settingsApi.getTimezone(),
          categoriesApi.list().catch(() => []),
        ]);
        if (!cancelled) {
          setRepaymentDay(dayRes.repaymentDay);
          setTimezone(tzRes.timezone || 'Europe/London');
          setCategories(Array.isArray(cats) ? cats : []);
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

  const handleImport = async () => {
    if (!importFile) {
      toast('请先选择 CSV 文件');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await transactionApi.importCsv(importFile);
      setImportResult(result);
      if (result.imported > 0) toast(`已导入 ${result.imported} 条`);
      if (result.failed > 0 && result.errors.length > 0) toast(`有 ${result.failed} 条导入失败`);
    } catch (e: unknown) {
      const err = e as Error;
      toast(err.message || '导入失败');
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast('请输入分类名称');
      return;
    }
    setAddingCategory(true);
    try {
      const created = await categoriesApi.create(name);
      setCategories((prev) => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
      setNewCategoryName('');
      toast('已添加');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err.response?.data?.error || '添加失败');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleStartEditCategory = (c: UserCategory) => {
    setEditingCategoryId(c.id);
    setEditingCategoryName(c.name);
  };

  const handleSaveEditCategory = async () => {
    if (editingCategoryId == null) return;
    const name = editingCategoryName.trim();
    if (!name) {
      toast('分类名称不能为空');
      return;
    }
    try {
      const updated = await categoriesApi.update(editingCategoryId, name);
      setCategories((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingCategoryId(null);
      setEditingCategoryName('');
      toast('已保存');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err.response?.data?.error || '保存失败');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('确定删除该分类？已有交易中的该分类将保留为文字，不会丢失。')) return;
    try {
      await categoriesApi.delete(id);
      setCategories((prev) => prev.filter((x) => x.id !== id));
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setEditingCategoryName('');
      }
      toast('已删除');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err.response?.data?.error || '删除失败');
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                分类管理
              </h2>
              <p className="text-sm mb-3" style={{ color: 'var(--theme-text-muted)' }}>自定义分类后，在「记一笔」中可从下拉选择</p>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="input-field max-w-[200px]"
                    placeholder="新分类名称"
                    aria-label="新分类名称"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="btn-primary"
                  >
                    {addingCategory ? '添加中...' : '添加'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 flex-wrap">
                      {editingCategoryId === c.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="input-field max-w-[180px]"
                            autoFocus
                            aria-label="编辑分类名称"
                          />
                          <button type="button" onClick={handleSaveEditCategory} className="btn-secondary text-sm">保存</button>
                          <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }} className="btn-secondary text-sm">取消</button>
                        </>
                      ) : (
                        <>
                          <span className="font-medium" style={{ color: 'var(--theme-text)' }}>{c.name}</span>
                          <button type="button" onClick={() => handleStartEditCategory(c)} className="text-sm" style={{ color: 'var(--theme-primary)' }}>编辑</button>
                          <button type="button" onClick={() => handleDeleteCategory(c.id)} className="text-sm text-red-600" aria-label={`删除分类 ${c.name}`}>删除</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {categories.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>暂无自定义分类，添加后记账时可从下拉选择</p>
                )}
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
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>当前时区</label>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 16m4-4v4" />
                </svg>
                数据导入
              </h2>
              <p className="text-sm mb-3" style={{ color: 'var(--theme-text-muted)' }}>上传 CSV，格式与导出一致：日期,类型,金额,货币,支付方式,分类,描述（首行为表头）</p>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="import-csv" className="sr-only">选择 CSV 文件</label>
                  <input
                    id="import-csv"
                    type="file"
                    accept=".csv"
                    className="text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setImportFile(f ?? null);
                      setImportResult(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || !importFile}
                    className="btn-primary"
                    aria-label="导入 CSV"
                  >
                    {importing ? '导入中...' : '导入'}
                  </button>
                </div>
                {importResult && (
                  <div className="text-sm rounded-lg p-3 border" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                    <p>成功导入 {importResult.imported} 条，失败 {importResult.failed} 条</p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-red-600 dark:text-red-400">
                        {importResult.errors.slice(0, 10).map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>… 还有 {importResult.errors.length - 10} 条错误</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                数据导出
              </h2>
              <p className="text-sm mb-3" style={{ color: 'var(--theme-text-muted)' }}>将交易记录导出为 CSV 或 Excel，可选日期范围（留空则导出全部）</p>
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
                    <label className="block text-sm font-medium mb-1" htmlFor="export-from" style={{ color: 'var(--theme-text)' }}>开始日期</label>
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
