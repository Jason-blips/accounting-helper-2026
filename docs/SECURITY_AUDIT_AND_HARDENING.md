# 安全审计：SQL 注入与 XSS 检查及加固建议

本文档基于当前代码库的检查结果，说明**是否存在漏洞**以及**你可自行实施的加固方法**（不直接改你代码，由你按需实施）。

---

## 一、SQL 注入

### 1.1 检查结论：**未发现明显 SQL 注入点**

- **JPA / Repository**
  - `TransactionRepository` 中所有 `@Query` 均使用**命名参数**（`:userId`、`:date`、`:start` 等），由 JPA 做参数绑定，不会拼进 SQL 字符串。
  - 分页筛选使用的 `Specification` / `CriteriaBuilder`（如 `buildListSpec` 中的 `cb.like(..., pattern)`）也是**参数化**的，`keyword` 等仅作为参数值传入，不会直接拼进 SQL。

- **JdbcTemplate**
  - `TransactionService.createTransaction`、`AuthService` 注册、`BillingCycleService` 预算写入、`EnsureAdminRunner` 等处的 SQL 均使用 **`?` 占位符 + 参数列表**，无字符串拼接。

- **独立工具**
  - `EnsureAdminUser.java` 使用 `PreparedStatement` 与 `?` 占位符，安全。

### 1.2 加固建议（可选，进一步降低风险）

1. **坚持“参数化”，禁止拼接**
   - 任何新增的 native SQL 或 JPQL 都只使用参数绑定（`?` 或 `:name`），**不要**用 `+`、`String.format`、`"..." + userInput` 等方式把用户输入拼进 SQL 字符串。

2. **对“日期/关键字”做格式校验再入库**
   - `TransactionService.getTransactions(userId, date)` 中 `date` 已通过 `LocalDateTime.parse` 校验格式，格式错误会走 catch，这是好的。
   - 建议：在 Controller 或 Service 入口对 `from`、`to`、`date` 做**白名单格式**校验（例如只允许 `yyyy-MM-dd`），再传给 Repository；对 `keyword`、`category`、`paymentMethod` 可做**长度上限**（如 200 字符）与字符集限制，避免异常值进入 Criteria。

3. **数据库用户权限**
   - 应用连接 DB 的账号只授予**当前库**的 DML/必要 DDL，不要给 DBA 或跨库权限，即使出现 bug 也可限制影响范围。

---

## 二、XSS（跨站脚本）

### 2.1 检查结论

- **主应用（React 前端）**
  - 未使用 `dangerouslySetInnerHTML`。
  - 用户数据（如 `transaction.description`、`transaction.category`）均通过 **`{variable}`** 形式渲染，React 默认会转义，**当前无 XSS 风险**。

- **main.tsx 中的 innerHTML**
  - 仅在 React 渲染失败时写入一段**固定静态 HTML**（“应用加载失败” + 刷新按钮），无用户输入，**安全**。

- **debug-admin.html（`frontend/public/`）**
  - 使用 `resultDiv.innerHTML = ...` 写入：
    - API 返回的 `user` 对象（`JSON.stringify(user, null, 2)`）
    - `error.message`
    - `user.role` 等
  - 若 API 或异常信息中 ever 包含 HTML/脚本（例如被篡改的 `user.role` 或错误信息中含 `<script>`），会**在浏览器中执行**，存在 **XSS 风险**。该页面多为管理员/调试用，风险相对可控，但仍建议加固。

### 2.2 加固建议（你可自行实施）

1. **debug-admin.html：用 textContent 替代 innerHTML 显示 JSON/文本**
   - 将：
     - `resultDiv.innerHTML = '<pre>' + JSON.stringify(user, null, 2) + '</pre>';`
     - 以及所有把 `error.message`、`user.role` 等拼进 HTML 再赋给 `innerHTML` 的地方，
   - 改为：
     - 先创建 `const pre = document.createElement('pre'); pre.textContent = JSON.stringify(user, null, 2); resultDiv.appendChild(pre);` 或 `resultDiv.textContent = ...`（并清空 `resultDiv` 再赋值），这样内容只会当作文本显示，不会解析 HTML。
   - 若必须保留部分 HTML 结构（如样式类），只对**不可信数据**用 `textContent` 写入，或先做 HTML 转义再拼接。

2. **后端 API 错误信息**
   - `GlobalExceptionHandler` 中把 `ex.getMessage()` 直接放入 `error.put("error", msg)` 并返回给前端。若某处 `throw new RuntimeException(userInput)` 或异常信息包含用户输入，会反射到响应中。建议：
     - 生产环境只返回**通用错误文案**（如“服务器内部错误”），不把 `ex.getMessage()` 直接返回；或对 `msg` 做白名单/截断后再返回。
     - 详细错误仅写日志，不返给前端。

3. **响应头（可选）**
   - 为 API 和前端页面统一设置：
     - `Content-Type: application/json`（API）或 `text/html; charset=utf-8`（页面），避免浏览器误解析。
     - `X-Content-Type-Options: nosniff`，减少 MIME 嗅探导致的内容被当脚本执行的风险。

4. **CSP（可选）**
   - 在 HTML 或服务器响应头中增加 Content-Security-Policy，例如只允许同源脚本与样式，禁止 `inline` 脚本（若你不需要内联脚本）。可有效缓解 XSS 被利用后的影响。

---

## 三、其他可选加固

- **输入长度与类型**
  - 对 `description`、`category`、`paymentMethod`、分类名称等在 DTO 或 Service 层做 **max length**（如 500/200 字符）与字符集校验，防止异常长或非法字符进入 DB 或日志。

- **分类名称等文本接口**
  - `CategoryController` 使用 `Map<String, String> body` 接收 `name`，无 Bean Validation。可改为带 `@Size(max=64)` 的 DTO 并用 `@Valid` 校验，避免超长或特殊字符。

- **生产环境关闭/限制调试页面**
  - 若 `debug-admin.html` 仅用于开发，生产部署时通过路由或静态资源规则**不对外提供**，或加鉴权，减少暴露面。

---

## 四、小结

| 类型       | 当前状态           | 建议 |
|------------|--------------------|------|
| SQL 注入   | 未发现明显漏洞     | 保持参数化；对日期/关键字做格式与长度校验 |
| XSS（主应用） | React 转义，安全   | 保持现状；新增功能勿用 `dangerouslySetInnerHTML` |
| XSS（debug 页） | innerHTML 接 API/错误信息，有风险 | 用 `textContent` 或转义显示 JSON/错误信息 |
| API 错误信息 | 直接返回 `ex.getMessage()` | 生产环境不返回详细异常信息，或先白名单/截断 |

按上述建议自行修改即可在不改变业务逻辑的前提下提升安全性；若你希望某一条落成具体补丁（例如某文件的 diff），可以指定文件与条目，再按你的习惯改。
