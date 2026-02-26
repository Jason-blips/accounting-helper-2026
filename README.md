# Tally Drop 落记 - 智能记账应用

**About:** Lightweight expense tracking with multi-currency, billing cycles, and AI insights — one codebase for Web and Android.

一个简单实用的记账应用，帮助你记录开销、分析消费，并通过 AI 提供省钱建议。

## ✨ 功能特性

- 📝 **记录开销**：快速记录收入和支出
- 💳 **多种支付方式**：银行卡、现金、微信支付
- 💷 **多货币支持**：GBP、CNY、USD、EUR 自动转换
- 📊 **数据统计**：收入、支出、余额一目了然，交易列表分页
- 📅 **还款周期**：按还款日划分周期，设置预期收支，生成分享图
- 🤖 **AI 分析**：智能分析消费趋势，提供省钱建议
- 🔐 **用户系统**：每个用户的数据独立安全
- ⚙️ **设置**：还款日、时区等集中管理

## 🛠️ 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Java 17 + Spring Boot 3 + JWT
- **数据库**：SQLite（轻量，无需单独安装）
- **移动端**：Capacitor（可选，打包为 Android App）
- **AI**：OpenAI API（可选）

## 📁 项目结构

```
Tally Drop 落记/
├── backend-java/       # Spring Boot 后端
│   ├── src/
│   ├── pom.xml
│   └── start.bat       # Windows 启动后端
├── frontend/           # React 前端
│   ├── src/
│   ├── android/       # Capacitor Android 工程
│   └── package.json
├── database/           # SQLite 数据库文件（自动创建）
├── docs/               # 文档（本地运行、部署等）
└── README.md
```

## 🚀 快速开始

### 环境要求

- **Node.js 18+**（前端开发与构建）
- **JDK 17+**（后端）
- **Maven 3.6+**（后端）

### 方式一：前端开发模式（推荐本地调试）

1. **启动后端**  
   在 `backend-java` 目录下双击 `start.bat`（或执行 `mvn spring-boot:run`），等待控制台出现 “Started CountingHelperApplication”。

2. **启动前端**  
   ```bash
   cd frontend
   npm install   # 首次运行
   npm run dev
   ```
   浏览器打开 **http://localhost:3000**，前端会通过代理访问本机 `http://localhost:8000/api`，使用本地数据库。

### 方式二：生产包 + 后端一体（单端口访问）

1. 构建前端并复制到后端静态目录：
   ```bash
   # 根目录下若有 build-frontend-and-copy.bat，可双击运行
   cd frontend
   npm run build
   # 将 dist 内容复制到 backend-java/src/main/resources/static/
   ```
2. 启动后端：在 `backend-java` 下运行 `start.bat`。
3. 浏览器打开 **http://localhost:8000**，前后端同源。

### 首次使用

1. 打开登录页，点击「注册」创建账号（用户名至少 3 字符，密码至少 6 字符，邮箱可选）。
2. 登录后可在「概览」查看统计，「添加交易」记一笔，「交易记录」查看/编辑/删除，「还款周期」按周期管理，「设置」中配置还款日与时区。

## ⚙️ 配置（可选）

- **AI 分析**：设置环境变量 `OPENAI_API_KEY`，或在 `backend-java` 运行环境中配置。不配置时 AI 分析使用基础模式。
- **数据库路径**：默认使用项目下 `database/accounting.db`。可通过环境变量 `DB_PATH` 或启动参数 `-Ddb.path=...` 覆盖。
- **生产环境**：前端生产构建时可通过 `frontend/.env.production` 中的 `VITE_API_URL` 指定后端 API 地址（如 `https://your-api.com/api`）。不设置则使用相对路径 `/api`（与后端同域部署时使用）。

## 📝 API 端点（摘要）

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/transactions` - 创建交易
- `GET /api/transactions` - 获取交易列表（支持 date、from、to）
- `GET /api/transactions/paged` - 分页获取交易（page、size、date、from、to）
- `GET /api/transactions/:id` - 获取单条交易
- `PUT /api/transactions/:id` - 更新交易
- `DELETE /api/transactions/:id` - 删除交易
- `GET /api/transactions/stats/summary` - 获取统计
- `GET /api/settings/repayment-day`、`PUT /api/settings/repayment-day` - 还款日
- `GET /api/settings/timezone`、`PUT /api/settings/timezone` - 时区
- `GET /api/billing-cycles` - 还款周期列表
- `PUT /api/billing-cycles/budget` - 设置周期预期收支
- `POST /api/analysis` - AI 分析
- `POST /api/currency/convert` - 货币转换

## 📖 更多说明

- 本地运行与登录（含「为何 localhost:8000 登录用的是线上」等）：见 **docs/本地运行与登录说明.md**。
- 上线方式（PWA / Capacitor / 原生）：见 **docs/上线方式评估_PWA与Hybrid与原生.md**。

## 🐛 常见问题

- **启动失败**：确认 JDK 17、Maven、Node 已安装；端口 8000（后端）、3000（前端 dev）未被占用。
- **无法登录**：若用生产包访问 localhost:8000，请确认前端构建时未指向线上 API（见 docs/本地运行与登录说明.md）。
- **AI 分析不工作**：配置 `OPENAI_API_KEY` 后重启后端；未配置时使用基础模式。

## 📄 许可证

MIT
