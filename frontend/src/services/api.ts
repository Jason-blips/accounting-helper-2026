import axios from 'axios';
import { getToken, removeToken, setUserRole } from './auth';
import type { User, Transaction, Stats, AnalysisResponse, BillingCycleDto, TransactionPage } from '../types';

// In app build (Capacitor), use VITE_API_URL (e.g. https://your-api.com/api). In dev/web, default is /api (proxy).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// 公开路径（无需 token）
const isPublicPath = (url: string) => {
  const u = (url || '').split('?')[0];
  return /\/auth\/(login|register)$/.test(u) || u.includes('/health') || u.includes('/currency/convert');
};

// 请求拦截器：添加 token；无 token 时对需认证接口直接重定向，避免必然的 401
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }
    const url = [config.baseURL, config.url].filter(Boolean).join('').replace(api.defaults.baseURL || '', '') || (config.url as string) || '';
    if (!isPublicPath(url) && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      removeToken();
      window.location.replace('/login');
      return Promise.reject(new Error('TOKEN_MISSING'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理错误，静默处理token失效
let isRedirecting = false; // 防止重复重定向
let redirectTimer: NodeJS.Timeout | null = null; // 延迟重定向定时器

api.interceptors.response.use(
  (response) => {
    // 正常响应直接返回
    return response;
  },
  (error) => {
    // 网络错误或无法连接服务器：派发事件供 ApiErrorBanner 显示提示（便于 App 用户感知）
    if (!error.response && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('counting-helper:api-network-error'));
    }
    // Token失效或未授权，静默重定向到登录页
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // 如果已经在登录页，不重定向
      if (window.location.pathname === '/login') {
        return Promise.reject(error);
      }
      
      // 防止重复重定向
      if (!isRedirecting) {
        isRedirecting = true;
        
        // 清除本地存储的认证信息
        removeToken();
        
        // 延迟重定向，确保页面已经渲染完成
        // 清除之前的定时器（如果有）
        if (redirectTimer) {
          clearTimeout(redirectTimer);
        }
        
        // 使用setTimeout延迟重定向，避免在页面加载时立即重定向导致空白页
        redirectTimer = setTimeout(() => {
          // 如果当前不在登录页，才重定向
          if (window.location.pathname !== '/login') {
            // 使用replace而不是href，避免在历史记录中留下记录
            try {
              window.location.replace('/login');
            } catch (e) {
              // 如果replace失败，尝试使用href
              window.location.href = '/login';
            }
          } else {
            isRedirecting = false;
          }
        }, 1000); // 延迟1秒，确保页面已经渲染
      }
      
      // 返回一个静默标记的响应，格式化为axios响应格式
      return Promise.resolve({
        data: { 
          silent: true,
          isTokenExpired: true 
        },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: error.config || {}
      });
    }
    
    // 其他错误正常处理
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (username: string, password: string, email?: string) => {
    const response = await api.post('/auth/register', { username, password, email });
    return response.data;
  },
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    const user = response.data;
    
    // 检查是否是token失效标记
    if (user?.silent || user?.isTokenExpired) {
      throw { silent: true, isTokenExpired: true };
    }
    
    // 更新本地存储的角色
    if (user.role) {
      setUserRole(user.role);
    }
    return user;
  },
};

/** 后端返回 camelCase（如 createdAt），前端使用 snake_case（created_at），此处统一转换 */
function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  return {
    id: raw.id as number,
    amount: raw.amount as number,
    currency: raw.currency as string,
    amount_in_gbp: (raw.amount_in_gbp ?? raw.amountInGbp) as number,
    description: (raw.description as string) ?? undefined,
    category: (raw.category as string) ?? undefined,
    payment_method: (raw.payment_method ?? raw.paymentMethod) as string,
    transaction_type: (raw.transaction_type ?? raw.transactionType) as '收入' | '支出',
    created_at: (raw.created_at ?? raw.createdAt) as string,
  };
}

/** 后端 TransactionRequest 通过 @JsonAlias 支持 snake_case，此处统一为 number + snake_case */
function toBackendTransactionPayload(p: Partial<Transaction> & { amount?: number | string }): Record<string, unknown> {
  const raw = p as Record<string, unknown>;
  const amount = typeof p.amount === 'string' ? parseFloat(p.amount) || 0 : (p.amount ?? 0);
  return {
    amount: Number(amount),
    currency: p.currency ?? 'GBP',
    description: p.description ?? '',
    category: p.category ?? '',
    payment_method: String(raw.payment_method ?? raw.paymentMethod ?? ''),
    transaction_type: String(raw.transaction_type ?? raw.transactionType ?? ''),
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString().slice(0, 10)),
  };
}

export const transactionApi = {
  create: async (transaction: Partial<Transaction> & { amount?: number | string }) => {
    const response = await api.post('/transactions', toBackendTransactionPayload(transaction));
    return response.data;
  },
  getAll: async (date?: string, from?: string, to?: string): Promise<Transaction[]> => {
    const params: Record<string, string> = {};
    if (from && to) {
      params.from = from;
      params.to = to;
    } else if (date) {
      params.date = date;
    }
    const response = await api.get('/transactions', { params });
    const data = response.data;
    if (data?.silent || data?.isTokenExpired) return data;
    if (!Array.isArray(data)) return [];
    return data.map((t: Record<string, unknown>) => normalizeTransaction(t));
  },
  getById: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}`);
    const data = response.data;
    if (data?.silent || data?.isTokenExpired) return data;
    return normalizeTransaction(data as Record<string, unknown>);
  },
  getPaged: async (
    page: number,
    size: number,
    opts?: {
      date?: string;
      from?: string;
      to?: string;
      type?: string;
      paymentMethod?: string;
      category?: string;
      keyword?: string;
    }
  ): Promise<TransactionPage> => {
    const params: Record<string, string | number> = { page, size };
    if (opts?.from && opts?.to) {
      params.from = opts.from;
      params.to = opts.to;
    } else if (opts?.date) {
      params.date = opts.date;
    }
    if (opts?.type) params.type = opts.type;
    if (opts?.paymentMethod) params.paymentMethod = opts.paymentMethod;
    if (opts?.category) params.category = opts.category;
    if (opts?.keyword?.trim()) params.keyword = opts.keyword.trim();
    const response = await api.get('/transactions/paged', { params });
    const data = response.data;
    if (data?.silent || data?.isTokenExpired) return data;
    const raw = data as {
      content?: unknown[];
      totalElements?: number;
      totalPages?: number;
      number?: number;
      size?: number;
    };
    return {
      content: (raw.content ?? []).map((t: Record<string, unknown>) => normalizeTransaction(t)),
      totalElements: raw.totalElements ?? 0,
      totalPages: raw.totalPages ?? 0,
      number: raw.number ?? 0,
      size: raw.size ?? size,
    };
  },
  update: async (id: number, transaction: Partial<Transaction> & { amount?: number | string }) => {
    const response = await api.put(`/transactions/${id}`, toBackendTransactionPayload(transaction));
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
  /** 导出交易为 CSV 或 Excel，可选日期范围；成功后触发浏览器下载 */
  export: async (format: 'csv' | 'excel', from?: string, to?: string): Promise<void> => {
    const params: Record<string, string> = { format: format === 'excel' ? 'excel' : 'csv' };
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get('/transactions/export', { params, responseType: 'blob' });
    const blob = response.data as Blob;
    const contentType = response.headers['content-type'] || '';
    if (response.status !== 200 || (contentType && contentType.includes('application/json'))) {
      const text = await blob.text();
      let msg = '导出失败';
      try {
        const json = JSON.parse(text);
        if (json?.error) msg = json.error;
      } catch {
        if (text) msg = text;
      }
      throw new Error(msg);
    }
    const filename = format === 'excel' ? 'transactions.xlsx' : 'transactions.csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const statsApi = {
  getSummary: async (): Promise<Stats> => {
    const response = await api.get('/transactions/stats/summary');
    return response.data;
  },
};

export const analysisApi = {
  analyze: async (period: 'day' | '3days' | 'week' | 'month' | 'all' = 'all'): Promise<AnalysisResponse> => {
    const response = await api.post('/analysis', { period });
    return response.data;
  },
};

export const currencyApi = {
  convert: async (amount: number, from: string, to: string) => {
    const response = await api.post('/currency/convert', { amount, from, to });
    return response.data;
  },
};

export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

export const settingsApi = {
  getRepaymentDay: async (): Promise<{ repaymentDay: number }> => {
    const response = await api.get('/settings/repayment-day');
    return response.data;
  },
  setRepaymentDay: async (day: number): Promise<{ repaymentDay: number }> => {
    const response = await api.put('/settings/repayment-day', { repaymentDay: day });
    return response.data;
  },
  getTimezone: async (): Promise<{ timezone: string }> => {
    const response = await api.get('/settings/timezone');
    return response.data;
  },
  setTimezone: async (timezone: string): Promise<{ timezone: string }> => {
    const response = await api.put('/settings/timezone', { timezone });
    return response.data;
  },
};

export const billingCyclesApi = {
  list: async (from?: string, to?: string): Promise<BillingCycleDto[]> => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get('/billing-cycles', { params });
    return response.data;
  },
  setBudget: async (
    cycleStart: string,
    expectedIncome?: number | null,
    expectedExpense?: number | null
  ): Promise<void> => {
    await api.put('/billing-cycles/budget', {
      cycleStart,
      expectedIncome: expectedIncome ?? null,
      expectedExpense: expectedExpense ?? null,
    });
  },
};

export const performanceApi = {
  getStats: async () => {
    const response = await api.get('/performance');
    return response.data;
  },
};
