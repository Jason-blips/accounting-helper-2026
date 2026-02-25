import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toPng } from 'html-to-image';
import Layout from '../components/Layout';
import ShareCard, {
  type DayStats,
  type ChartBarItem,
} from '../components/ShareCard';
import { transactionApi, billingCyclesApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { Transaction } from '../types';

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function addDays(ymd: string, delta: number): string {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function computeDayStats(transactions: Transaction[]): DayStats {
  const income = transactions
    .filter((t) => t.transaction_type === '收入')
    .reduce((s, t) => s + t.amount_in_gbp, 0);
  const expense = transactions
    .filter((t) => t.transaction_type === '支出')
    .reduce((s, t) => s + t.amount_in_gbp, 0);
  return {
    income,
    expense,
    balance: income - expense,
    incomeCount: transactions.filter((t) => t.transaction_type === '收入').length,
    expenseCount: transactions.filter((t) => t.transaction_type === '支出').length,
  };
}

function getDateStr(t: Transaction): string {
  const raw = t.created_at || '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : raw.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/** 按日分组汇总，用于一周图表；保证 7 天都有（从 dateFrom 到 dateTo） */
function buildWeekBars(
  transactions: Transaction[],
  dateFrom: string,
  dateTo: string
): ChartBarItem[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(dateFrom, i);
    if (d > dateTo) break;
    map.set(d, { income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const d = getDateStr(t);
    if (!map.has(d)) continue;
    const cur = map.get(d)!;
    if (t.transaction_type === '收入') cur.income += t.amount_in_gbp;
    else cur.expense += t.amount_in_gbp;
  }
  const list: ChartBarItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(dateFrom, i);
    if (d > dateTo) break;
    const cur = map.get(d) ?? { income: 0, expense: 0 };
    const x = new Date(d + 'T12:00:00');
    list.push({
      label: `${x.getMonth() + 1}/${x.getDate()}`,
      income: cur.income,
      expense: cur.expense,
    });
  }
  return list;
}

/** 按周分组汇总，用于一月图表；约 4 周 */
function buildMonthBars(
  transactions: Transaction[],
  dateFrom: string,
  dateTo: string
): ChartBarItem[] {
  const list: ChartBarItem[] = [];
  for (let w = 0; w < 4; w++) {
    const start = addDays(dateFrom, w * 7);
    const end = addDays(dateFrom, w * 7 + 6);
    if (start > dateTo) break;
    const endClamped = end > dateTo ? dateTo : end;
    const label = `${start.slice(5, 7).replace(/^0/, '')}/${start.slice(8, 10).replace(/^0/, '')}`;
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const d = getDateStr(t);
      if (d >= start && d <= endClamped) {
        if (t.transaction_type === '收入') income += t.amount_in_gbp;
        else expense += t.amount_in_gbp;
      }
    }
    list.push({ label, income, expense });
  }
  return list;
}

export type SharePeriod = 'day' | 'week' | 'month' | 'cycle';

export default function Share() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);
  const urlPeriod = searchParams.get('period');
  const urlFrom = searchParams.get('from') || '';
  const urlTo = searchParams.get('to') || '';
  const isCycleFromUrl = urlPeriod === 'cycle' && urlFrom && urlTo;

  const [period, setPeriod] = useState<SharePeriod>(isCycleFromUrl ? 'cycle' : 'day');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [cycleRange, setCycleRange] = useState<{ from: string; to: string } | null>(
    isCycleFromUrl ? { from: urlFrom, to: urlTo } : null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cycleExpected, setCycleExpected] = useState<{ income?: number | null; expense?: number | null }>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const dateFrom =
    period === 'cycle' && cycleRange
      ? cycleRange.from
      : period === 'week'
        ? addDays(selectedDate, -6)
        : period === 'month'
          ? addDays(selectedDate, -29)
          : selectedDate;
  const dateTo = period === 'cycle' && cycleRange ? cycleRange.to : selectedDate;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let data: Transaction[];
      if (period === 'day') {
        data = await transactionApi.getAll(selectedDate);
      } else {
        data = await transactionApi.getAll(undefined, dateFrom, dateTo);
      }
      if ((data as { silent?: boolean; isTokenExpired?: boolean })?.silent || (data as { isTokenExpired?: boolean })?.isTokenExpired) return;
      setTransactions(Array.isArray(data) ? data : []);
      if (period === 'cycle' && dateFrom && dateTo) {
        const cycles = await billingCyclesApi.list(dateFrom, dateTo);
        const c = cycles.find((x) => x.startDate === dateFrom && x.endDate === dateTo) || cycles[0];
        if (c) setCycleExpected({ income: c.expectedIncome, expense: c.expectedExpense });
      }
    } catch (e) {
      console.error(e);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDate, dateFrom, dateTo]);

  useEffect(() => {
    if (isCycleFromUrl && !cycleRange) setCycleRange({ from: urlFrom, to: urlTo });
  }, [isCycleFromUrl, urlFrom, urlTo, cycleRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = computeDayStats(transactions);
  const chartBars: ChartBarItem[] =
    period === 'week'
      ? buildWeekBars(transactions, dateFrom, dateTo)
      : period === 'month'
        ? buildMonthBars(transactions, dateFrom, dateTo)
        : [];

  const handleGenerate = async () => {
    const node = cardRef.current;
    if (!node) {
      toast('无法生成图片');
      return;
    }
    setGenerating(true);
    setImageDataUrl(null);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      setImageDataUrl(dataUrl);
      toast('图片已生成');
    } catch (e) {
      console.error(e);
      toast('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const downloadFilename =
    period === 'day'
      ? `账单_${selectedDate}.png`
      : period === 'cycle'
        ? `账单_周期_${dateFrom}_${dateTo}.png`
        : period === 'week'
          ? `账单_一周_${dateFrom}_${dateTo}.png`
          : `账单_一月_${dateFrom}_${dateTo}.png`;

  const handleSave = () => {
    if (!imageDataUrl) return;
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = downloadFilename;
    a.click();
    toast('已保存到本地');
  };

  const handleShare = async () => {
    if (!imageDataUrl) return;
    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch {
      // not in Capacitor
    }
    if (isNative) {
      try {
        const { Share } = await import('@capacitor/share');
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
        const path = downloadFilename.replace(/\//g, '-');
        await Filesystem.writeFile({
          path,
          data: base64,
          directory: Directory.Cache,
        });
        const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
        await Share.share({
          title: period === 'day' ? `账单 ${selectedDate}` : `账单 ${dateFrom} 至 ${dateTo}`,
          files: [uri],
          dialogTitle: '分享到微信、QQ、小红书等',
        });
        toast('已打开分享');
      } catch (e) {
        console.error(e);
        toast('分享失败');
      }
      return;
    }
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(imageDataUrl)).blob();
        const file = new File([blob], downloadFilename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: period === 'day' ? `账单 ${selectedDate}` : `账单 ${dateFrom} 至 ${dateTo}`,
            files: [file],
          });
          toast('已分享');
          return;
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
      }
    }
    handleSave();
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">生成分享图</h1>
          <p className="text-gray-600 text-sm">
            按当天、一周或一月生成账单图，可保存或分享到微信、QQ、小红书、抖音等
          </p>
        </div>

        {!isCycleFromUrl && (
          <div className="card p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">统计范围</label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { value: 'day' as const, label: '当天' },
                    { value: 'week' as const, label: '一周' },
                    { value: 'month' as const, label: '一月' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      period === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {period === 'day' ? '选择日期' : '选择结束日期'}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field max-w-xs"
              />
              {period !== 'day' && (
                <p className="text-xs text-gray-500 mt-1">
                  {period === 'week' ? '一周' : '一月'}：{dateFrom} 至 {dateTo}
                </p>
              )}
            </div>
          </div>
        )}
        {isCycleFromUrl && (
          <div className="card p-3">
            <p className="text-sm text-gray-600">
              还款周期：{dateFrom} 至 {dateTo}
            </p>
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center">
            <div className="spinner w-10 h-10 mx-auto border-blue-600"></div>
            <p className="text-gray-500 mt-3">加载中...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <div ref={cardRef} className="flex justify-center">
                <ShareCard
                  date={dateTo}
                  dateFrom={period === 'day' ? undefined : dateFrom}
                  period={period}
                  stats={stats}
                  transactions={period === 'day' ? transactions : []}
                  chartBars={chartBars}
                  expectedIncome={period === 'cycle' ? cycleExpected.income : undefined}
                  expectedExpense={period === 'cycle' ? cycleExpected.expense : undefined}
                  width={380}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="spinner w-5 h-5 border-white border-2"></span>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                    生成图片
                  </>
                )}
              </button>
              {imageDataUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    保存到相册
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    分享到好友
                  </button>
                </>
              )}
            </div>

            {imageDataUrl && (
              <p className="text-sm text-gray-500 text-center">
                在 App 内会打开系统分享，可发送到微信、QQ、小红书、抖音或保存到相册
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
