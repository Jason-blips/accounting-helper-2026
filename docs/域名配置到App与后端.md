# 把域名 jiangluo.api.uk 配进 App 与后端

你已注册域名（如 jiangluo.api.uk 或 api.jiangluo.uk），要让它被 App 和网页访问到，需要：**先让域名指向你的后端服务器**，再在**前端/App 里填这个地址**。

---

## 一、先让域名能访问到你的后端（服务器侧）

只注册域名还不够，还要：

1. **有一台服务器**（云主机、VPS 等），把 **backend-java** 部署上去，用 Nginx 反向代理到 8000 端口（可参考 `docs/服务器常驻运行_Nginx部署.md`）。
2. **在域名服务商处做 DNS 解析**：
   - 若 API 用子域名，例如 **api.jiangluo.uk**：  
     添加一条 **A 记录**，主机记录填 `api`，记录值填你服务器的 **公网 IP**。
   - 若直接用 **jiangluo.api.uk**：  
     添加 **A 记录**，主机记录填 `@` 或留空，记录值填服务器公网 IP。
3. **在服务器上配好 HTTPS**（推荐用 Let's Encrypt），这样地址是 `https://api.jiangluo.uk` 或 `https://jiangluo.api.uk`。

完成后，在浏览器访问 `https://你的域名/api/health` 能打开，说明后端已对外可用。

---

## 二、在项目里填 API 地址（App / 网页用）

### 1. 前端/App 用的环境变量

在 **frontend** 目录下已有 **`.env.production`**，当前已配置为：

```env
VITE_API_URL=https://app.jiangluo.uk/api
```

- 即前端/App 的服务器地址 **https://app.jiangluo.uk**，接口统一走 `/api`。详见 **`docs/配置app.jiangluo.uk.md`**。
- 若 `.env.production` 尚未配置，请新建该文件并写入上面一行。
- 若你改用单独 API 域名（如 `api.jiangluo.uk`），把上面改成 `https://api.jiangluo.uk/api` 即可。**必须以 `/api` 结尾**。
- 必须用 **HTTPS**，不要用 `http://`。

### 2. 重新打 APK（让新地址进 App）

改完 `.env.production` 后，在 **frontend** 目录执行：

```bash
npm run cap:sync
```

然后用 **Android Studio** 再打一次 **Signed Release APK**。新 APK 里就会用你填的域名地址。

### 3. 网页版（若你还有网站）

若网页版也是用同一套 frontend 部署的，部署时用同一份 `.env.production`（或构建时传入同样的 `VITE_API_URL`），这样网页也会请求你域名下的 API。

---

## 三、对照检查

| 步骤 | 说明 |
|------|------|
| 1. 服务器部署后端 | 在服务器上跑 JAR，Nginx 转发到 8000，并配好 HTTPS |
| 2. DNS 解析 | 把 api.jiangluo.uk 或 jiangluo.api.uk 指到服务器 IP |
| 3. 改 .env.production | 填 `VITE_API_URL=https://你的域名/api` |
| 4. npm run cap:sync + 重打 APK | 新 APK 才会用新地址 |

域名「进去」= 先让域名在服务器侧生效，再在 **frontend/.env.production** 里填这个地址并重新打包。
