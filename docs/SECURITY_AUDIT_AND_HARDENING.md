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

---

## 五、自查方法（以后你也可以按这套流程自己查）

### 5.1 SQL 注入：怎么查、怎么防

**检查步骤：**

1. **搜“拼进 SQL”的写法**
   - 在后端代码里搜：`+ "`、`+ '`、`String.format`、`concat`、`"SELECT.*" +`、`"INSERT.*" +` 等，且附近有请求参数、RequestBody、路径变量或用户输入。
   - 重点文件：所有 `*Repository.java`、`*Service.java`、任何用 `JdbcTemplate`、`EntityManager.createNativeQuery`、`Statement` 的地方。
   - **危险**：任何把 `request.getXxx()`、`@RequestParam`、`@PathVariable`、表单字段等**直接拼进 SQL 字符串**的，都算潜在 SQL 注入。

2. **确认“安全写法”**
   - **安全**：SQL 里只有 `?` 占位符，参数用 `jdbcTemplate.update(sql, param1, param2, ...)` 或 `PreparedStatement.setXxx()` 传入。
   - **安全**：JPA 里 `@Query` 使用 `:paramName` 且参数用 `@Param("paramName")` 绑定，或方法名派生查询（如 `findByUserId`），没有把用户输入拼进 query 字符串。
   - **安全**：`CriteriaBuilder` / `Specification` 里用 `cb.equal(root.get("field"), value)`、`cb.like(..., pattern)` 等，`value`/`pattern` 来自用户但作为**参数**传入，不是拼进 SQL 字符串。

**防护原则（你自己做时记住）：**

- **一律参数化**：所有 SQL/JPQL 里涉及用户输入的地方，只用占位符（`?` 或 `:name`）并绑定参数，绝不拼接。
- **输入校验**：对日期做格式白名单（如 `yyyy-MM-dd`），对关键字、分类名等做长度上限（如 200 字符）和字符集限制，再进查询或入库。
- **权限最小化**：DB 账号只给当前库需要的权限，不给 DBA/跨库权限。

---

### 5.2 XSS：怎么查、怎么防

**检查步骤：**

1. **搜“把数据当 HTML 写进页面”的写法**
   - 前端搜：`dangerouslySetInnerHTML`、`innerHTML`、`outerHTML`、`document.write`、`insertAdjacentHTML`。
   - 看赋给这些的**内容来源**：若来自 API 响应、URL 参数、用户输入、`error.message` 等，且没有做转义或白名单，就是潜在 XSS。

2. **区分“是否含用户/接口数据”**
   - **相对安全**：`innerHTML` 赋值为**写死的常量字符串**（如错误页的“应用加载失败”），没有插任何用户或接口数据。
   - **有风险**：`innerHTML = ... + user.role + ...`、`innerHTML = ... + error.message + ...`、`innerHTML = JSON.stringify(apiResponse)` 等，一旦数据里带 `<script>` 或 `onerror=` 等，就会执行。

3. **React 默认行为**
   - 用 `{variable}` 渲染时，React 会转义，**不会**把 `variable` 当 HTML 解析，所以一般安全。
   - 只有 `dangerouslySetInnerHTML={{ __html: ... }}` 会按 HTML 渲染，需要确保 `...` 要么是可信内容，要么已经过转义/过滤。

**防护原则（你自己做时记住）：**

- **能不用 innerHTML 就不用**：显示纯文本或 JSON 时，用 `textContent` 或 React 的 `{variable}`。
- **必须用 innerHTML 时**：只插入**自己构造的、不含用户数据的 HTML**，或对用户/接口数据先做 **HTML 转义**（如 `<` → `&lt;`，`>` → `&gt;`，`"` → `&quot;` 等）再插入。
- **接口错误信息**：生产环境不要直接把异常 `getMessage()` 或堆栈返回给前端；可返回通用文案，详细内容只写日志。
- **可选**：加响应头 `X-Content-Type-Options: nosniff`；需要时再加 CSP（Content-Security-Policy）限制脚本来源，减轻 XSS 影响。

---

### 5.3 快速检索命令（供你在项目里自己搜）

**Linux / macOS / Git Bash：**

- **SQL 相关**（在后端目录执行）：  
  `grep -r "createNativeQuery\|createQuery\|JdbcTemplate\|PreparedStatement\|Statement" --include="*.java" .`  
  然后逐个看是否有字符串拼接 SQL。

- **XSS 相关**（在前端/静态页目录执行）：  
  `grep -r "innerHTML\|dangerouslySetInnerHTML\|document\.write" --include="*.tsx" --include="*.ts" --include="*.html" .`  
  然后看赋值右侧是否包含接口数据或用户输入。

**Windows（PowerShell，在项目根或对应目录下执行）：**

- **SQL 相关**（在 `backend-java` 目录下）：  
  `Get-ChildItem -Recurse -Filter *.java | Select-String "createNativeQuery|createQuery|JdbcTemplate|PreparedStatement|Statement"`

- **XSS 相关**（在 `frontend` 目录下）：  
  `Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts,*.html | Select-String "innerHTML|dangerouslySetInnerHTML|document\.write"`

按上面“检查步骤 + 防护原则”做一遍，就能系统性地自查 SQL 注入和 XSS，并自己实施防护。
