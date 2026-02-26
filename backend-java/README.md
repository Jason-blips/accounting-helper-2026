# Tally Drop 落记 Backend - Java版本

智能记账应用后端服务（Spring Boot实现）

## 🚀 快速开始

### 一键启动

双击运行 `start.bat` 即可启动服务

### 环境要求

- Java 17+
- Maven 3.6+
- 数据库：SQLite（`../database/accounting.db`）

### 服务地址

- **API基础URL**: http://localhost:8000/api
- **健康检查**: http://localhost:8000/api/health

### 配置

编辑 `src/main/resources/application.yml` 或设置环境变量：

```yaml
jwt:
  secret: ${JWT_SECRET:your-secret-key}
  
openai:
  api-key: ${OPENAI_API_KEY:}  # 可选，用于AI分析功能
```

## 📝 API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 交易接口

- `POST /api/transactions` - 创建交易
- `GET /api/transactions` - 获取交易列表（支持?date=YYYY-MM-DD参数）
- `PUT /api/transactions/{id}` - 更新交易
- `DELETE /api/transactions/{id}` - 删除交易
- `GET /api/transactions/stats/summary` - 获取统计摘要

### 分析接口

- `POST /api/analysis` - AI智能分析

### 货币转换

- `POST /api/currency/convert` - 货币转换

### 管理员接口

- `GET /api/admin/users` - 获取所有用户（需管理员权限）
- `GET /api/admin/stats` - 获取系统统计（需管理员权限）
- `DELETE /api/admin/users/{id}` - 删除用户（需管理员权限）

### 系统接口

- `GET /api/health` - 健康检查

## 🔐 认证说明

所有需要认证的接口都需要在请求头中添加：

```
Authorization: Bearer <token>
```

Token通过登录接口获取，有效期为30天。

## 📊 数据库

- 使用SQLite数据库，路径：`../database/accounting.db`
- 数据库模式为只读验证（validate），不会修改现有表结构
- 所有数据操作都兼容现有数据库

## 🛠️ 技术栈

- Spring Boot 3.2.0
- Spring Security + JWT
- Spring Data JPA
- SQLite JDBC
- OpenAI Java SDK
- Maven

## 📦 项目结构

```
backend-java/
├── src/main/java/com/countinghelper/
│   ├── CountingHelperApplication.java    # 主应用类
│   ├── config/                            # 配置类
│   ├── controller/                        # REST控制器
│   ├── service/                           # 业务逻辑层
│   ├── repository/                        # 数据访问层
│   ├── entity/                           # 实体类
│   ├── dto/                               # 数据传输对象
│   ├── security/                          # 安全相关
│   └── exception/                         # 异常处理
└── src/main/resources/
    └── application.yml                    # 配置文件
```

## 🧪 测试

### 使用Postman（推荐）

1. 导入 `CountingHelper.postman_collection.json`
2. 运行"登录"请求（自动保存token）
3. 测试其他API端点

### 默认测试账户

- **用户名**: manager
- **密码**: SecurPass2026!

### 详细文档

- 📖 **快速开始**: `快速开始.md`
- 🧪 **测试指南**: `启动后测试指南.md`
- 📋 **项目总结**: `项目完成总结.md`
- 🎓 **简历描述**: `STAR简历描述.md`
- 🔧 **故障排除**: `故障排除.md`

## ⚠️ 注意事项

1. **数据库安全**：项目配置为只验证表结构，不会修改现有数据库
2. **密码加密**：使用BCrypt加密，与Node.js版本兼容
3. **JWT Token**：使用相同的secret和过期时间，确保兼容性
