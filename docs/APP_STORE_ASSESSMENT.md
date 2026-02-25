# Counting Helper — 应用商店发布评估

## 当前项目形态

- **前端**：React + TypeScript + Vite + Tailwind（Web 应用）
- **后端**：Java Spring Boot，REST API，SQLite
- **运行方式**：浏览器访问，前端与后端可同机部署或分开部署

要上架 **Google Play** 或 **iOS App Store**，需要把现有 Web 前端做成「可安装的 App」，并让 App 访问已部署的后端 API。

---

## 方案：用 Capacitor 打包成移动 App（推荐）

**Capacitor**（Ionic 团队）把现有 React 前端包进原生壳里，生成：

- **Android**：可上传 Google Play 的 AAB/APK  
- **iOS**：可上传 App Store 的 IPA（需在 Mac 上构建）

**优点**：

- 不重写界面，继续用现有 React 代码
- 一套前端代码，可同时出 Android + iOS
- 与 Vite 构建流程兼容良好
- 后续可加推送、本地通知等原生能力

**前提**：后端必须先部署到公网（如云服务器），App 里配置该 API 地址（例如 `https://your-api.com/api`）。

---

## 哪个商店更容易？— **先上 Google Play 更合适**

| 对比项           | Google Play（Android）     | iOS App Store           |
|------------------|----------------------------|--------------------------|
| 开发者费用       | 一次性约 $25               | 每年 $99                 |
| 构建环境         | Windows 即可（Android Studio） | 需要 Mac + Xcode     |
| 审核时长/严格度   | 通常 1–3 天，相对宽松      | 常 1–7 天，规则更细      |
| 首次上架难度     | 较低                       | 较高                     |
| 同一套前端代码   | ✅ 支持（Capacitor）        | ✅ 支持（Capacitor）      |

**结论**：  
- **更容易**：先做成 **可发布到 Google Play 的 Android App**（成本低、不强制要 Mac）。  
- **之后**：若需要 iOS 版，在同一套 Capacitor 项目里加 iOS 平台，在 Mac 上构建并提交 App Store。

---

## 发布前要做的事

### 1. 后端上线

- 将 Spring Boot 部署到公网（如 AWS / 阿里云 / Railway / 自己的 VPS）。
- 提供 HTTPS 的 API 根地址，例如：`https://api.countinghelper.com`，且接口统一带前缀 `/api`（与现有后端一致）。

### 2. 前端/App 配置

- 在 App（及生产环境 Web）里使用「后端 API 根地址」而不是相对路径 `/api`。
- 项目里已通过环境变量（如 `VITE_API_URL`）配置生产环境 API 地址，打包 App 时使用该变量。

### 3. 仅先发 Android（Google Play）时

- 安装 Android Studio，用 Capacitor 生成并打开 Android 工程。
- 在 Android Studio 里生成签名密钥、构建 **AAB**（推荐）或 APK。
- 注册 [Google Play 开发者账号](https://play.google.com/console)（约 $25），创建应用、填写商店信息、上传 AAB、提交审核。

### 4. 若要再发 iOS（App Store）

- 需要 Mac，安装 Xcode。
- 在项目中执行 `npx cap add ios`，用 Xcode 打开 `ios` 工程，配置签名与 App ID。
- 注册 [Apple Developer](https://developer.apple.com)（$99/年），在 App Store Connect 创建应用、上传 IPA、提交审核。

---

## 项目里已做的改动（便于发布）

- 在 **frontend** 中接入 **Capacitor**，并添加 **Android** 平台配置。
- 前端通过 **环境变量** 区分开发/生产 API 地址，便于 App 指向你的线上后端。
- 提供 **构建与同步** 脚本说明，便于生成 Android 安装包并进一步打包 AAB 上架。

具体步骤见：**frontend/README_APP_BUILD.md**（或项目内同名的 App 构建说明）。

---

## 简短结论

- **理解你的目标**：把 Counting Helper 做成「能上架应用商店」的 App，而不是只在浏览器里用。  
- **更容易的一条路**：用 **Capacitor** 把现有 React 前端打成 **Android App**，先发布到 **Google Play**；同一套代码以后可再打 iOS 版上架 App Store。  
- **最难/最前提的一步**：把 **后端部署到公网** 并配置好 HTTPS，App 才能在实际用户设备上正常使用。
