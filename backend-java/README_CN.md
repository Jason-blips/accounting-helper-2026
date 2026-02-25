# Counting Helper Backend - Java版本

智能记账应用后端服务（Spring Boot实现）

## ✨ 项目概述

这是一个完整的Java后端项目，从Node.js全栈应用重构而来，实现了用户认证、交易管理、AI分析等完整功能。

## 🚀 快速开始

### 一键启动

```bash
cd backend-java
start.bat
```

### 验证服务

访问：http://localhost:8000/api/health

应该看到：`{"status":"healthy"}`

## 📋 功能清单

- ✅ 用户认证（注册、登录、JWT）
- ✅ 交易管理（CRUD操作）
- ✅ 统计分析
- ✅ AI智能分析
- ✅ 货币转换
- ✅ 管理员功能
- ✅ 系统监控

## 🧪 测试

### 使用Postman

1. 导入 `CountingHelper.postman_collection.json`
2. 运行"登录"请求获取token
3. 测试其他API

### 测试账户

- 用户名: `manager`
- 密码: `SecurPass2026!`

## 📚 文档

- `快速开始.md` - 快速上手指南
- `启动后测试指南.md` - 详细测试步骤
- `项目完成总结.md` - 项目总结
- `STAR简历描述.md` - 简历描述模板
- `故障排除.md` - 问题解决指南

## 🛠️ 技术栈

- Spring Boot 3.2.0
- Spring Security + JWT
- Spring Data JPA
- SQLite
- Maven

## ⚠️ 重要提示

- 数据库配置为只读验证模式，不会修改现有数据
- 所有API与Node.js版本完全兼容
- 现有用户可以使用原密码登录
