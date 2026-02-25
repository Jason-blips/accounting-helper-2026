# 把服务器地址 app.jiangluo.uk 配进项目

前端/App 通过 **VITE_API_URL** 请求后端，需要指向你的服务器 **https://app.jiangluo.uk**。

---

## 一步：配置 API 地址

在 **frontend** 目录下创建或编辑 **`.env.production`**，内容为：

```env
VITE_API_URL=https://app.jiangluo.uk/api
```

- 地址**必须以 `/api` 结尾**，与后端提供的接口路径一致。
- 保存后，**生产构建**（`npm run build` / `npm run build:app`）和**打包出的 APK** 都会使用该地址。

---

## 生效方式

| 场景 | 操作 |
|------|------|
| 网页部署到 app.jiangluo.uk | 用上述 `.env.production` 执行 `npm run build`，把 `frontend/dist` 部署到该域名即可。 |
| 打 Android APK | 同上配置，然后 `npm run build:app` → `npx cap sync android`，再用 Android Studio 打 Release 包。 |
| 本地开发 | 不读 `.env.production`，默认走 `/api`（vite 代理到本机后端），无需改。 |

配置完成后，访问 https://app.jiangluo.uk/login 的网页或安装的 App 都会请求 `https://app.jiangluo.uk/api` 作为后端。
