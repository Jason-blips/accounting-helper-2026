# Token过期优化说明

## 📋 修改的文件列表

### 后端文件

1. **`server/index.js`** - Token过期时间优化
   - 延长token过期时间：从7天改为30天
   - 优化token验证错误响应：使用错误代码（TOKEN_EXPIRED, TOKEN_MISSING）
   - 统一错误处理：所有401/403错误返回统一格式

### 前端文件

2. **`frontend/src/services/api.ts`** - Token失效静默处理
   - 优化响应拦截器：静默处理token失效
   - 防止重复重定向：使用标志位控制
   - 使用`window.location.replace`：避免在历史记录中留下记录
   - 使用`requestAnimationFrame`：确保在下一个渲染周期执行，避免阻塞

3. **`frontend/src/components/Layout.tsx`** - 优化用户角色获取
   - 处理静默错误：忽略token失效时的错误
   - 避免在token失效时显示错误信息

## ⚡ 优化内容

### 1. Token过期时间延长

- **之前**：7天
- **现在**：30天
- **影响**：用户登录后30天内无需重新登录

### 2. Token失效静默处理

- **之前**：显示错误信息，然后重定向
- **现在**：静默重定向到登录页，不显示任何错误
- **优势**：
  - 用户体验更好，不会看到错误提示
  - 自动清理本地存储的认证信息
  - 防止重复重定向

### 3. 性能优化

- 使用`requestAnimationFrame`：确保重定向在下一个渲染周期执行
- 使用`window.location.replace`：避免在浏览器历史记录中留下记录
- 防止重复重定向：使用标志位控制，避免多次触发

### 4. 错误处理统一

- 后端统一返回错误代码：`TOKEN_EXPIRED`、`TOKEN_MISSING`
- 前端统一处理：所有401/403错误都静默重定向
- 不影响其他错误：其他错误正常显示

## 🔧 技术细节

### 后端Token验证

```javascript
// 统一错误代码
if (!token) {
  return res.status(401).json({ error: 'TOKEN_MISSING' });
}

if (err) {
  return res.status(401).json({ error: 'TOKEN_EXPIRED' });
}
```

### 前端错误拦截

```typescript
// 静默处理token失效
if (error.response?.status === 401 || error.response?.status === 403) {
  if (!isRedirecting) {
    isRedirecting = true;
    removeToken();
    requestAnimationFrame(() => {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    });
  }
  return Promise.resolve({ data: null, silent: true });
}
```

## ✅ 测试建议

1. **Token过期测试**：
   - 等待30天或手动修改token使其过期
   - 访问需要认证的页面
   - 应该静默重定向到登录页，不显示错误

2. **并发请求测试**：
   - 在token失效时发起多个API请求
   - 应该只重定向一次，不会重复重定向

3. **性能测试**：
   - 使用压力测试工具测试token验证性能
   - 确保token验证不影响整体性能

## 💡 进一步优化建议

1. **Token刷新机制**（可选）：
   - 在token即将过期时自动刷新
   - 使用refresh token机制
   - 减少用户需要重新登录的频率

2. **记住我功能**（可选）：
   - 添加"记住我"选项
   - 记住我时使用更长的过期时间（如90天）
   - 未选择时使用标准过期时间（30天）

3. **Token黑名单**（可选）：
   - 实现token黑名单机制
   - 用户退出登录时使token失效
   - 提高安全性
