# Counting Helper 项目 - 遇到的问题与解决过程（STAR 描述）

> 用于简历/面试的 STAR 素材：在智能记账应用开发与维护中遇到的关键问题及完整解决过程。

---

## 一、总览（可作简历一句话）

在 **Counting Helper** 全栈项目中，独立排查并解决了**交易列表为空、添加交易 400、还款日设置 500、SQLite 与 Hibernate 兼容性**等问题，并完成**时区与还款日 1–31** 需求，保证前后端数据格式一致、后端在 SQLite 下稳定运行。

---

## 二、问题与解决过程（按时间/类型）

### 1. 交易记录页为空 + 控制台「无法解析日期」多次

**Situation**  
总收支有数据，但交易记录页显示「暂无交易记录」；控制台重复出现「无法解析日期」警告。

**Task**  
让交易列表正确展示，并消除无效日期导致的报错。

**Action**  
- **根因**：后端返回字段为 camelCase（如 `createdAt`、`amountInGbp`、`transactionType`），前端按 snake_case（`created_at` 等）使用，导致解析失败、列表为空。
- **接口层**：在 `api.ts` 中统一用 `normalizeTransaction()` 将后端 camelCase 转为前端 snake_case，GET 列表时对每条记录做转换。
- **提交/更新**：POST/PUT 时用 `toBackendTransactionPayload()` 将前端 snake_case 转回后端所需格式再发送。
- **页面层**：在 `Transactions.tsx` 中对空或无效日期静默跳过、去掉「无法解析日期」的 warn；`setTransactions` 仅在 `Array.isArray(data)` 时赋值，避免非数组响应污染列表。

**Result**  
交易记录页正常展示，控制台无多余日期解析警告，前后端字段约定清晰可维护。

---

### 2. 添加交易一直返回 400（SQLite 不支持 getGeneratedKeys）

**Situation**  
点击「添加交易」后请求 `POST /api/transactions` 始终返回 400，前端无法新建交易。

**Task**  
定位 400 的真实原因并修复，使添加交易功能可用。

**Action**  
- **定位**：通过前端打印 400 响应体，得到错误信息：`Unable to extract generated-keys ResultSet [not implemented by SQLite JDBC driver]`。说明问题在**数据库层**，而非参数校验。
- **根因**：Hibernate 在 INSERT 后通过 JDBC `getGeneratedKeys()` 取自增主键，而 **SQLite JDBC 驱动未实现该方法**，导致抛错并被包装成 400。
- **方案**：在 `TransactionService.createTransaction()` 中**不再使用** `transactionRepository.save(transaction)`，改为：
  1. 用 **JdbcTemplate** 执行原生 `INSERT`（列与值与原逻辑一致）；
  2. 在同一事务、同一连接上执行 **`SELECT last_insert_rowid()`** 得到新插入行的 ID；
  3. 将 ID 设回实体并返回，控制器仍返回 201 与 `id`。
- **附带**：为 `HttpMessageNotReadableException` 增加全局处理，返回明确「请求体无效或格式错误」等提示，便于以后排查类似 400。

**Result**  
添加交易成功，接口返回 201 与新建 ID；在 SQLite 下不再依赖 getGeneratedKeys，插入逻辑稳定。

---

### 3. 还款日手动设置显示「设置失败」（同上：SQLite getGeneratedKeys）

**Situation**  
还款日若从未设置过，用户手动选择还款日后点击保存，提示「设置失败」；接口为 `PUT /api/settings/repayment-day`。

**Task**  
让还款日设置首次保存也能成功。

**Action**  
- **根因**：还款日保存在 `user_settings` 表；首次设置会 **INSERT** 新行。与「添加交易」相同，JPA `save()` 在 SQLite 下无法通过 getGeneratedKeys 取回自增 ID，导致异常并表现为「设置失败」。
- **实现**：在 `BillingCycleService.setRepaymentDay()` 中不再调用 `userSettingRepository.save()`，改为：
  1. 用 JdbcTemplate 先执行 **UPDATE**（若该用户已有 `repayment_day` 配置）；
  2. 若 **UPDATE 影响行数为 0**，再执行 **INSERT**（仅 `user_id, setting_key, setting_value`），不依赖返回的自增 ID。
- 还款日仍做 1–28 的合法范围校验（后续需求中改为 1–31）。

**Result**  
无论是否首次设置，还款日均可保存成功，不再受 SQLite JDBC 限制。

---

### 4. 设置还款日接口返回 500（表不存在 + 请求体类型）

**Situation**  
部分环境下 `PUT /api/settings/repayment-day` 返回 500，前端只看到「请求失败」，无法定位原因。

**Task**  
消除 500 或至少返回可读错误信息，并在表缺失时自动修复。

**Action**  
- **请求体**：控制器原用 `Map<String, Integer>` 接收 `repaymentDay`，若前端或网关传入类型不一致易导致解析异常。改为 `Map<String, Object>` 并安全解析：支持 Number、字符串数字，非法时返回 400 与「repaymentDay 应为 1–31 的数字」。
- **getUserId**：对 `Authentication.getPrincipal()` 做类型判断（Number/Integer）再转 Integer，避免 ClassCastException 导致 500。
- **表缺失**：在 `BillingCycleService.setRepaymentDay()` 中 catch `DataAccessException`，若异常信息包含「no such table」或「user_settings」，则调用 **ensureUserSettingsTable()** 创建 `user_settings` 与 `billing_cycle_budget` 表及索引（与 migration 脚本一致），然后**重试**一次写入。用户无需手动执行 SQL 即可完成首次设置。
- **全局异常**：在 `GlobalExceptionHandler` 中为 `RuntimeException` 返回 body 时，若 `getMessage()` 为空则尝试 `getCause().getMessage()`，保证 500 时响应体总有 `error` 字段。
- **前端**：保存还款日失败时，toast 优先展示后端返回的 `error` 文案，便于用户或支持人员排查。

**Result**  
表缺失时自动建表并设置成功；其他异常时接口返回明确错误信息，前端可展示给用户或用于排查。

---

### 5. 还款日改为 1–31 号 + 时区（北京时间 / 英国时间）

**Situation**  
业务要求：还款日可选 1–31 号（原为 1–28）；支持时区区分（如北京时间、英国时间），影响「今天」等展示与默认日期。

**Task**  
后端、前端统一支持 1–31；增加时区设置并在相关页面生效。

**Action**  
- **还款日 1–31**：  
  - 后端：`BillingCycleService` 中 `getRepaymentDay` / `setRepaymentDay` 的 clamp 与校验由 1–28 改为 1–31；周期计算本身已用 `Math.min(repaymentDay, month.lengthOfMonth())`，自然支持 29/30/31。  
  - 前端：还款日下拉改为 1–31；周期说明文案区分「每月 1 号至当月最后一天」与「本月 X 号至下月 Y 号/最后一天」。
- **时区**：  
  - 后端：在 `user_settings` 中增加 key `timezone`，值为 IANA 时区（如 `Asia/Shanghai`、`Europe/London`）。`BillingCycleService` 增加 `getTimezone(userId)`、`setTimezone(userId, timezone)`，默认 `Europe/London`。新增 `GET/PUT /api/settings/timezone`。  
  - 前端：在还款周期页增加时区下拉（英国时间 / 北京时间），选完即调用 API 保存；新增 `getTodayInTimezone(timezone)`（基于 `toLocaleDateString(..., { timeZone })`），添加交易页的**默认日期**改为按当前用户时区计算「今天」。

**Result**  
还款日可选 1–31，周期展示正确；用户可切换英国/北京时区，新建交易默认日期与所选时区一致。

---

### 6. 还款周期列表从 2025 年 12 月开始显示

**Situation**  
用户从 2025 年 12 月开始记账，希望还款周期列表从该时间起显示，而不是「过去一年」。

**Task**  
调整默认查询范围，使周期列表起点为 2025-12-01。

**Action**  
在 `BillingCycles.tsx` 中，请求周期列表时不再使用「一年前到今天」，而是将 `from` 固定为 **`2025-12-01`**，`to` 仍为当天。这样一打开还款周期页即可看到从 2025 年 12 月起的周期（如「2025年12月18日 - 1月17日」）。

**Result**  
列表默认从 2025 年 12 月开始，符合用户实际使用时间线。

---

### 7. 其他与稳定性、可维护性相关的改动

- **TransactionRequest**：为 DTO 增加 `@JsonAlias`（如 `payment_method` → `paymentMethod`）、`@JsonIgnoreProperties(ignoreUnknown = true)`；`amount` 的 setter 支持 Number 或 String，避免前端传参格式差异导致反序列化失败。
- **前端构建**：修复多处 TypeScript/未使用变量等问题，保证 `npm run build` 通过；`build-frontend-and-copy.bat` 在根目录执行 build 并将 `frontend/dist` 拷到 `backend-java/src/main/resources/static`，便于用 `backend-java/start.bat` 一键启动并看到最新前端。
- **文档**：在 `docs/如何查看效果与验证功能.md` 中补充「先运行 build-frontend-and-copy 再 start.bat」、总收支有数但交易为空的排查、以及 `/api/transaction-info`、SQL 检查脚本等说明。

---

## 三、可提炼的 STAR 短版（面试口述用）

- **S**：智能记账应用使用 SQLite + Spring Boot + React，上线后出现交易列表为空、添加交易 400、还款日设置失败/500 等问题。
- **T**：需要在不动大架构的前提下，让交易与设置功能在 SQLite 下稳定可用，并支持还款日 1–31 和双时区。
- **A**：通过响应体定位到 SQLite JDBC 不支持 getGeneratedKeys；对「插入并需取回 ID」的写操作改用 JdbcTemplate + `last_insert_rowid()`，对仅需 UPSERT 的设置用 JdbcTemplate 的 UPDATE/INSERT 替代 JPA save；统一前后端字段命名与类型、增加全局异常提示与表缺失时自动建表；前端增加时区与还款日范围并固定周期查询起点。
- **R**：添加交易、还款日与时区设置全部正常，控制台无无关报错，用户可在英国/北京时区下从 2025 年 12 月起查看周期并记账。

---

## 四、技术栈与关键词（便于简历筛选）

- **后端**：Java 17, Spring Boot, Spring Security, JPA/Hibernate, JdbcTemplate, SQLite, JWT  
- **前端**：React, TypeScript, Vite, Axios  
- **能力**：问题定位（Network/响应体/日志）、前后端数据契约、SQLite 与 ORM 兼容、时区与日期处理、渐进式修复与文档同步更新  
