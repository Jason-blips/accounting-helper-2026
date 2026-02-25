# Counting Helper - 智能记账应用

一个简单实用的记账应用，帮助你记录开销、分析消费，并通过AI提供省钱建议。

## ✨ 功能特性

- 📝 **记录开销**：快速记录收入和支出
- 💳 **多种支付方式**：银行卡、现金、微信支付
- 💷 **多货币支持**：GBP、CNY、USD、EUR自动转换
- 📊 **数据统计**：收入、支出、余额一目了然
- 🤖 **AI分析**：智能分析消费趋势，提供省钱建议
- 🔐 **用户系统**：每个用户的数据独立安全

## 🚀 快速开始

### 一键启动

双击运行：`启动.bat`

脚本会自动：
- ✅ 检查Node.js环境
- ✅ 安装依赖
- ✅ 启动后端和前端
- ✅ 自动打开浏览器

### 环境要求

- **Node.js 18+** （只需这一个！）

## 📖 使用说明

### 1. 首次使用

1. 运行 `启动.bat`
2. 浏览器自动打开，进入登录页面
3. 点击"注册"，创建账号：
   - 用户名（至少3个字符）
   - 密码（至少6个字符）
   - 邮箱（可选）

### 2. 记录交易

1. 点击"添加交易"
2. 填写信息：
   - 交易类型：收入/支出
   - 金额和货币
   - 支付方式
   - 分类（可选）
   - 描述（可选）
3. 点击"添加交易"

### 3. 查看统计

- **概览**：查看总收入、总支出、余额
- **交易记录**：查看所有交易，可以删除
- **AI分析**：获取智能分析和省钱建议

## 🛠️ 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Node.js + Express
- **数据库**：SQLite（轻量，无需安装）
- **AI**：OpenAI API（可选）

## 📁 项目结构

```
Counting Helper/
├── server/              # Node.js后端
│   ├── index.js        # 主服务器文件
│   ├── package.json
│   └── .env.example    # 环境变量示例
├── frontend/            # React前端
│   ├── src/
│   └── package.json
├── database/            # 数据库文件（自动创建）
├── 启动.bat            # 一键启动脚本
└── README.md
```

## ⚙️ 配置（可选）

### AI分析功能

如果需要AI分析功能，编辑 `server/.env` 文件：

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**注意**：不配置API Key也能使用，AI分析将使用基础模式。

## 🔧 手动启动

### 启动后端

```bash
cd server
npm install  # 首次运行
npm start
```

### 启动前端

```bash
cd frontend
npm install  # 首次运行
npm run dev
```

## 📝 API端点

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/transactions` - 创建交易
- `GET /api/transactions` - 获取交易列表
- `DELETE /api/transactions/:id` - 删除交易
- `GET /api/transactions/stats/summary` - 获取统计
- `POST /api/analysis` - AI分析
- `POST /api/currency/convert` - 货币转换

## 💡 使用技巧

1. **定期记录**：养成每天记录开销的习惯
2. **分类管理**：使用分类功能，更好地了解支出结构
3. **查看分析**：定期查看AI分析，获取省钱建议
4. **设置预算**：根据分析结果，设置合理的月度预算

## 🐛 常见问题

### 启动失败

- 确保已安装Node.js 18+
- 检查端口8000和3000是否被占用
- 查看后端和前端窗口的错误信息

### 无法登录

- 确保后端正在运行（端口8000）
- 检查用户名和密码是否正确
- 查看浏览器控制台（F12）的错误信息

### AI分析不工作

- 检查是否配置了OpenAI API Key
- 如果没有配置，会使用基础分析模式

## 📄 许可证

MIT
"# counting-helper-2026" 
