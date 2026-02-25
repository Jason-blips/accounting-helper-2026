-- 检查数据库中是否有交易数据（在项目根目录执行）：
-- sqlite3 database/accounting.db < database/check_transactions.sql
-- 或使用 SQLite 工具打开 accounting.db 后执行下面语句。

-- 每个 user_id 的交易笔数
SELECT '按用户统计:' AS info;
SELECT user_id, COUNT(*) AS count FROM transactions GROUP BY user_id;

-- 用户表 id 与用户名（核对 user_id 是否对应用户）
SELECT '用户列表:' AS info;
SELECT id, username FROM users;

-- 最近 3 条交易（含 user_id、created_at）
SELECT '最近3条交易:' AS info;
SELECT id, user_id, amount_in_gbp, transaction_type, created_at FROM transactions ORDER BY id DESC LIMIT 3;
