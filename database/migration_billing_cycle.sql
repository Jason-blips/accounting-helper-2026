-- Run this once on your accounting.db to add repayment day and cycle budget support.
-- Example: sqlite3 database/accounting.db < database/migration_billing_cycle.sql

-- User settings (e.g. repayment day 1-28)
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  UNIQUE(user_id, setting_key)
);

-- Expected income/expense per billing cycle
CREATE TABLE IF NOT EXISTS billing_cycle_budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cycle_start TEXT NOT NULL,
  expected_income REAL,
  expected_expense REAL,
  UNIQUE(user_id, cycle_start)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_billing_cycle_budget_user ON billing_cycle_budget(user_id, cycle_start);
