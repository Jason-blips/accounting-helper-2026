export interface User {
  id: number;
  username: string;
  email?: string;
  role?: 'user' | 'admin';
  created_at?: string;
  transaction_count?: number;
}

export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  amount_in_gbp: number;
  description?: string;
  category?: string;
  payment_method: string;
  transaction_type: '收入' | '支出';
  created_at: string;
}

export interface Stats {
  income: string;
  expense: string;
  balance: string;
  incomeCount: number;
  expenseCount: number;
}

export interface AnalysisResponse {
  analysis: string;
  model?: string;
  error?: string;
}

export interface BillingCycleDto {
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  expectedIncome?: number | null;
  expectedExpense?: number | null;
}

export interface TransactionPage {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
