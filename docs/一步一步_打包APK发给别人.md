# 一步一步：打包 APK 发给别人安装

按下面顺序做，做完就能得到一个可安装的 APK，发给别人即可使用。

---

## 第 0 步：确认环境（只需做一次）

- 已安装 **Node.js 18+**（[nodejs.org](https://nodejs.org)）
- 已安装 **Android Studio**（[developer.android.com/studio](https://developer.android.com/studio)）
- 项目能正常运行（后端、前端都跑得起来）

---

## 第 1 步：决定 App 要连的后端地址

App 打开后会请求你配置的 API 地址，测试用户必须能访问到。

**二选一：**

| 方式 | 适合 | 你要做的 |
|------|------|----------|
| **同一 WiFi** | 别人和你在一个网络下 | 本机运行后端，在 frontend 里填你电脑的局域网 IP（见下） |
| **公网/临时公网** | 别人不在你身边 | 后端部署到公网或本机用 ngrok 暴露，在 frontend 里填该地址 |

**同一 WiFi 时：**

1. 在本机运行 `backend-java\start.bat`，保证后端在跑。
2. 在 CMD 里输入 `ipconfig`，找到「IPv4 地址」，例如 `192.168.1.100`。
3. 在项目里 **frontend** 目录下新建或编辑 **`.env.production`**，内容一行：
   ```env
   VITE_API_URL=http://192.168.1.100:8000/api
   ```
   把 `192.168.1.100` 换成你查到的 IP。

**公网时：** 把上面的地址改成你的公网 API 地址（需带 `/api`），例如 `https://api.你的域名.com/api`。

---

## 第 2 步：在 frontend 里安装依赖并同步到 Android

1. 打开 **CMD 或 PowerShell**。
2. 进入项目里的 **frontend** 目录，例如：
   ```bash
   cd c:\Users\12527\code\Counting Helper\frontend
   ```
   （路径按你电脑实际改。）
3. 依次执行：
   ```bash
   npm install
   ```
   等安装完再执行：
   ```bash
   npm run cap:sync
   ```
4. 看到类似 “Sync complete” 或没有报错即可。这一步会把网页打包并同步到 **frontend/android**。

---

## 第 3 步：用 Android Studio 打开 Android 工程

1. 打开 **Android Studio**。
2. 菜单 **File → Open**（不要选 Open Recent）。
3. 在弹窗里选你项目里的 **frontend\android** 文件夹（必须选 **android** 这一层），点「确定」。
   - 正确示例：`C:\Users\12527\code\Counting Helper\frontend\android`
   - 不要选：项目根目录、frontend 根目录。
4. 等待 Gradle 同步完成（右下角进度条），如有提示升级 Gradle/插件可先点「Remind me later」或按默认。

---

## 第 4 步：生成签名的 APK

1. 在 Android Studio 菜单点 **Build → Generate Signed Bundle / APK**。
2. 选择 **APK**，点 **Next**。
3. **选择或创建密钥：**
   - **第一次**：点 **Create new...**
     - Key store path：选一个位置并起名，例如 `counting-helper.jks`（记住路径和密码）。
     - Password、Alias、Key password 填好并记住（以后更新要用同一密钥）。
     - 填完后点 OK。
   - **已有密钥**：选 **Choose existing...**，选你的 `.jks` 或 `.keystore`，输入密码。
4. 点 **Next**，**Build Variants** 选 **release**，点 **Finish**。
5. 等构建完成，底部会提示 **locate** 或 **APK(s) generated successfully**。

---

## 第 5 步：找到 APK 并发给别人

1. 生成的 APK 一般在：
   ```text
   frontend\android\app\build\outputs\apk\release\app-release.apk
   ```
   在资源管理器里打开上述路径即可看到 **app-release.apk**。
2. 把这个 **app-release.apk** 发给对方（微信、网盘、邮件等）。
3. 对方在 Android 手机上：
   - 下载 APK 后点击安装；
   - 若提示「不允许安装未知应用」，到 **设置 → 安全/应用管理** 里允许「来自此来源」安装即可。

---

## 小结（5 步）

| 步 | 做什么 |
|----|--------|
| 0 | 确认 Node、Android Studio 已装 |
| 1 | 在 frontend 配置 `.env.production` 里的 `VITE_API_URL`（后端地址） |
| 2 | 在 frontend 执行 `npm install` 和 `npm run cap:sync` |
| 3 | 用 Android Studio 打开 **frontend\android** |
| 4 | Build → Generate Signed Bundle / APK → 选 APK → 选/建密钥 → release → 完成 |
| 5 | 从 `app\build\outputs\apk\release\` 取出 **app-release.apk** 发给别人 |

以后若改了前端或 API 地址，从**第 1 步**（如需改地址）和**第 2 步**重新做，再重复第 3～5 步即可打出新 APK。
