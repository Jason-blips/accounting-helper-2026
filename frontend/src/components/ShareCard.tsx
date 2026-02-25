import type { Transaction } from '../types';
import { formatCurrency, formatDateChinese } from '../utils/format';

export interface DayStats {
  income: number;
  expense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

/** 用于周/月图表的每日或每周汇总 */
export interface ChartBarItem {
  label: string;
  income: number;
  expense: number;
}

interface ShareCardProps {
  /** 当天日期或范围结束日 (YYYY-MM-DD) */
  date: string;
  /** 范围开始日，仅 week/month 时用 */
  dateFrom?: string;
  /** 当天 | 一周 | 一月 | 还款周期 */
  period: 'day' | 'week' | 'month' | 'cycle';
  stats: DayStats;
  /** 仅 period=day 时展示明细 */
  transactions: Transaction[];
  /** 周/月时的每日或每周汇总，用于柱状图 */
  chartBars?: ChartBarItem[];
  /** 还款周期时的预期收支（可选） */
  expectedIncome?: number | null;
  expectedExpense?: number | null;
  width?: number;
}

function DonutChart({ income, expense }: { income: number; expense: number }) {
  const total = income + expense || 1;
  const incomePct = total ? (income / total) * 100 : 0;
  const expensePct = total ? (expense / total) * 100 : 0;
  const r = 44;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;
  const incomeStroke = (incomePct / 100) * circumference;
  const expenseStroke = (expensePct / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {incomePct > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth={stroke}
          strokeDasharray={`${incomeStroke} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      )}
      {expensePct > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#ef4444"
          strokeWidth={stroke}
          strokeDasharray={`${expenseStroke} ${circumference}`}
          strokeDashoffset={-incomeStroke}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      )}
    </svg>
  );
}

/** 简要柱状图：多组 income/expense，用于周/月 */
function BarsChart({ items }: { items: ChartBarItem[] }) {
  const max = Math.max(
    1,
    ...items.flatMap((i) => [i.income, i.expense])
  );
  const h = 80;
  const gap = 4;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(280, items.length * 32)} ${h}`}
        className="min-h-[80px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {items.map((item, i) => {
          const x = i * 32 + 4;
          const w = 24;
          const incomeH = max > 0 ? (item.income / max) * (h - 16) : 0;
          const expenseH = max > 0 ? (item.expense / max) * (h - 16) : 0;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={h - 14 - incomeH}
                width={w - 2}
                height={Math.max(incomeH, 0.5)}
                rx={2}
                fill="#10b981"
              />
              <rect
                x={x}
                y={h - 14 - incomeH - expenseH - gap}
                width={w - 2}
                height={Math.max(expenseH, 0.5)}
                rx={2}
                fill="#ef4444"
              />
              <text
                x={x + w / 2}
                y={h - 2}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ShareCard({
  date,
  dateFrom,
  period,
  stats,
  transactions,
  chartBars = [],
  expectedIncome,
  expectedExpense,
  width = 380,
}: ShareCardProps) {
  const displayList = transactions.slice(0, 12);
  const isDay = period === 'day';
  const isCycle = period === 'cycle';
  const isToday =
    isDay &&
    (() => {
      const today = new Date();
      const d = new Date(date);
      return (
        today.getFullYear() === d.getFullYear() &&
        today.getMonth() === d.getMonth() &&
        today.getDate() === d.getDate()
      );
    })();

  const headerTitle =
    period === 'day'
      ? isToday
        ? '今日账单'
        : '每日账单'
      : period === 'week'
        ? '一周账单'
        : period === 'month'
          ? '一月账单'
          : '账单周期';

  const headerSub =
    period === 'day'
      ? formatDateChinese(date)
      : dateFrom
        ? `${formatDateChinese(dateFrom)} - ${formatDateChinese(date)}`
        : formatDateChinese(date);

  return (
    <div
      className="bg-white rounded-2xl shadow-xl overflow-hidden"
      style={{
        width: width,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
        <div className="text-sm font-medium opacity-90">{headerTitle}</div>
        <div className="text-xl sm:text-2xl font-bold mt-1">{headerSub}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-4 pb-2">
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide">收入</div>
          <div className="text-lg font-bold text-green-700 mt-0.5">
            {formatCurrency(stats.income, 'GBP')}
          </div>
          <div className="text-xs text-green-600 mt-0.5">{stats.incomeCount} 笔</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">支出</div>
          <div className="text-lg font-bold text-red-700 mt-0.5">
            {formatCurrency(stats.expense, 'GBP')}
          </div>
          <div className="text-xs text-red-600 mt-0.5">{stats.expenseCount} 笔</div>
        </div>
        <div
          className={`rounded-xl p-3 text-center border ${
            stats.balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
          }`}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-wide ${
              stats.balance >= 0 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            结余
          </div>
          <div
            className={`text-lg font-bold mt-0.5 ${
              stats.balance >= 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {formatCurrency(stats.balance, 'GBP')}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-4 py-4 border-b border-gray-100">
        <DonutChart income={stats.income} expense={stats.expense} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-700">收入</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-gray-700">支出</span>
          </div>
        </div>
      </div>

      {/* 周期/周/月：预期收支（仅 cycle 且已设置时显示） */}
      {isCycle && (expectedIncome != null || expectedExpense != null) && (
        <div className="px-4 py-2 border-b border-gray-100 bg-amber-50/50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">预期</div>
          <div className="flex gap-4 text-sm">
            {expectedIncome != null && (
              <span className="text-amber-700">收入 {formatCurrency(expectedIncome, 'GBP')}</span>
            )}
            {expectedExpense != null && (
              <span className="text-amber-700">支出 {formatCurrency(expectedExpense, 'GBP')}</span>
            )}
          </div>
        </div>
      )}

      {/* 周/月：简要趋势图（cycle 不展示柱状图） */}
      {!isDay && !isCycle && chartBars.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {period === 'week' ? '每日' : '每周'}收支
          </div>
          <BarsChart items={chartBars} />
        </div>
      )}

      {/* 仅当天：明细列表 */}
      {isDay && (
        <div className="px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            明细
          </div>
          {displayList.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">当日暂无记录</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-hidden">
              {displayList.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`flex-shrink-0 w-2 h-2 rounded-full ${
                        t.transaction_type === '收入' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-800 truncate">
                      {t.description ||
                        t.category ||
                        (t.transaction_type === '收入' ? '收入' : '支出')}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                      t.transaction_type === '收入' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {t.transaction_type === '收入' ? '+' : '-'}
                    {formatCurrency(t.amount_in_gbp, 'GBP')}
                  </span>
                </div>
              ))}
            </div>
          )}
          {transactions.length > displayList.length && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              共 {transactions.length} 笔，仅展示前 {displayList.length} 笔
            </div>
          )}
        </div>
      )}

      {/* 周/月/周期：仅显示笔数提示 */}
      {!isDay && (
        <div className="px-4 py-3 text-center">
          <span className="text-sm text-gray-500">共 {stats.incomeCount + stats.expenseCount} 笔交易</span>
        </div>
      )}

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
        <span className="text-sm font-medium text-gray-500">Counting Helper · 记一笔</span>
      </div>
    </div>
  );
}
