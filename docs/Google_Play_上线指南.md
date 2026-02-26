# Tally Drop 落记 — Google Play 上线指南

本文说明如何在不改动**现有功能与数据库**的前提下，把当前项目以**手机端 App** 形式上架 Google Play，用作客户端推广。并评估「命令行打包」与「使用 Android Studio」两种方式，给出推荐与具体步骤。

---

## 一、当前项目状态（不动现有功能与数据库）

- **前端**：React + TypeScript + Vite，已接入 **Capacitor 6**，已有 **Android 工程**（`frontend/android/`）。
- **后端**：Spring Boot + SQLite，现有接口与数据保持不变。
- **App 形态**：Capacitor 把前端打包进原生壳，生成可安装的 Android App，通过配置的 API 地址访问你的后端。

你只需要：**部署后端到公网** → **配置 App 的 API 地址** → **用 Android Studio 打签名包并上传 Play**。无需改业务逻辑或数据库结构。

---

## 二、两种上线方式对比与推荐

### 方式 A：纯命令行打包（Gradle 打 AAB）

- **做法**：在项目里用 `./gradlew bundleRelease`（或 `gradlew.bat`）打出 AAB，在 `build.gradle` 里配置签名，用命令行或脚本完成打包。
- **优点**：适合 CI/CD、脚本化、不依赖 IDE。
- **缺点**：首次要自己创建 keystore、配置 `signingConfigs`、处理 ProGuard 等；排查构建/签名问题不如 IDE 直观。

### 方式 B：使用 Android Studio 打包并上传（推荐）

- **做法**：用 Android Studio 打开 `frontend/android` 工程，通过 **Build → Generate Signed Bundle / APK** 向导生成签名 AAB，再在 Play 控制台上传（或从 Android Studio 内上传）。
- **优点**：
  - 向导式创建/选择 keystore，签名配置清晰，不易配错。
  - 可直观查看构建日志、依赖、Gradle 报错。
  - 你已安装 Android Studio，无需额外搭建命令行签名流程。
  - 后续更新版本、改 versionCode/versionName、打不同渠道包，都在同一套工程里操作，便于维护。
- **缺点**：需要打开 IDE，对纯自动化流水线需再配合 Gradle 脚本（但首次上架不必须）。

### 结论：你的 App **更适合用 Android Studio 方式上线 Google Play**

- 项目已是 **Capacitor + 标准 Android 工程**，用 Android Studio 打开即可，无需“额外打包方式”。
- 首次上架需要：**签名密钥、AAB、商店资料、审核**，这些在 Android Studio 里完成最省心。
- “打包”和“利用 Android Studio”本质是**同一条构建链**（都是 Gradle 产出 AAB），区别只是**用 IDE 操作还是纯命令行**；对你当前阶段，**推荐用 Android Studio 做签名与构建**，再在浏览器里打开 Play Console 上传 AAB 即可。

---

## 三、上线前必须完成的一件事：后端公网可访问

App 在用户手机里不能访问 `localhost`，必须访问**公网 HTTPS 地址**。

1. 将现有 **Spring Boot 后端**部署到公网（如云服务器、Railway、Render、自己的 VPS 等）。
2. 配置好 **HTTPS**（域名 + SSL），得到 API 根地址，例如：  
   `https://api.yourdomain.com`  
   且接口统一带前缀 `/api`（与现有后端一致），例如：  
   `https://api.yourdomain.com/api/auth/login`。
3. 确保不修改现有接口与数据库结构，只做部署与域名/HTTPS 配置。

---

## 四、具体操作步骤（使用 Android Studio）

### 步骤 1：配置 App 使用的 API 地址（不改代码逻辑，只配环境变量）

在 **frontend** 目录下：

- 新建 `.env.production`（若不存在），内容示例：
  ```env
  # 替换为你的公网后端地址，必须带 /api
  VITE_API_URL=https://api.yourdomain.com/api
  ```
- 或构建时临时指定（PowerShell）：
  ```powershell
  $env:VITE_API_URL="https://api.yourdomain.com/api"; npm run build:app
  ```

前端已有逻辑：当存在 `VITE_API_URL` 时，App 内请求会发往该地址；否则在开发时用 `/api`（代理）。不改变任何业务功能或数据库。

### 步骤 2：构建前端并同步到 Android 工程

在 **frontend** 目录执行：

```bash
npm install
npm run cap:sync
```

`cap:sync` 会先执行 `build:app`（使用 `--mode app`，资源路径适配 App），再把 `dist/` 同步到 `android` 工程。这样 Android 工程里是最新前端。

### 步骤 3：用 Android Studio 打开 Android 工程

在 **frontend** 目录执行：

```bash
npx cap open android
```

或在 Android Studio 中 **File → Open**，选择项目里的 **`frontend/android`** 目录（不要选项目根或 frontend 根）。

### 步骤 4：在 Android Studio 中生成签名 AAB（推荐）或 APK

1. 菜单 **Build → Generate Signed Bundle / APK**。
2. 选择 **Android App Bundle (AAB)**（Google Play 推荐），下一步。
3. 选择或创建 **Keystore**：
   - 首次：Create new，选择路径、密码、别名、密钥密码，并**妥善保管** keystore 和密码（丢失无法更新同一应用）。
   - 已有：选择现有 keystore 并输入密码。
4. 选择 **release**，完成构建。  
   生成的 AAB 通常在：  
   `frontend/android/app/build/outputs/bundle/release/app-release.aab`。

如需 APK（例如内测分发），可在同一向导里选 **APK** 并签名。

### 步骤 5：上传到 Google Play

1. 打开 [Google Play 控制台](https://play.google.com/console)，使用开发者账号（约 $25 一次性）。
2. 创建应用（若尚未创建），填写商店信息：应用名称、简短说明、完整说明、图标、截图等（可参考项目内 `docs/GOOGLE_PLAY_LISTING.md` 若有）。
3. 在 **发布 → 正式版/测试版** 中，上传步骤 4 生成的 **AAB**。
4. 完成内容分级、隐私政策等必填项后，提交审核。

审核通过后，用户即可在 Google Play 搜索并安装你的 App；App 会使用你在步骤 1 配置的公网 API，**不会动到你本地的功能或数据库**。

---

## 五、后续更新 App（仍不动现有功能与数据库）

1. 前端有改动时：在 **frontend** 下再次执行 `npm run cap:sync`。
2. 在 **Android Studio** 中：
   - 如需更新版本号：在 `frontend/android/app/build.gradle` 里修改 `versionCode`（整数递增）和 `versionName`（如 `"1.0.1"`）。
   - 再次 **Build → Generate Signed Bundle / APK**，用**同一 keystore** 签名。
3. 在 Play 控制台上传新 AAB，发布新版本即可。

---

## 六、简要对照：你的 App 更适合哪种方式

| 维度           | 纯命令行打包 (Gradle)     | 使用 Android Studio（推荐）     |
|----------------|---------------------------|---------------------------------|
| 是否适合你     | 适合 CI/自动化            | 适合首次上架、已装 Android Studio |
| 签名与 AAB     | 需手写 signingConfigs     | 向导创建 keystore、一键打 AAB   |
| 排查构建问题   | 看日志、改 Gradle         | IDE 内直接看报错与依赖          |
| 对现有功能/DB  | 无影响                    | 无影响                          |

**结论**：当前阶段用 **Android Studio 打包并上传 Google Play** 更合适；不改变任何已有功能与数据库，只做部署、环境变量和商店发布配置。

更多整体评估（含 iOS、架构）见 **docs/APP_STORE_ASSESSMENT.md**；构建细节见 **frontend/README_APP_BUILD.md**。
