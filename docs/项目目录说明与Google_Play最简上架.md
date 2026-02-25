# 项目目录说明 + Google Play 最简上架

遵循奥卡姆剃刀：只保留必要说明，只做最少步骤达成上架。

---

## 一、各目录作用（只看和运行/上架有关的）

| 目录/文件 | 作用 |
|-----------|------|
| **frontend** | 前端全部在这里：React + Vite，页面、接口调用、样式。**上架用的 App 也来自这里**（Capacitor 把 frontend 打成 Android 包）。 |
| **frontend/src** | 页面组件（pages）、公共组件（components）、接口（services）、类型（types）、工具（utils）等源码。 |
| **frontend/android** | Capacitor 生成的 **Android 工程**。不手改代码，只用来在 Android Studio 里**打开、签名、打 AAB**。 |
| **frontend/dist** | `npm run build` / `build:app` 的输出，打包进 App 或部署到网站的就是这里。 |
| **backend-java** | **当前使用的后端**：Spring Boot，提供 REST API、登录、交易、统计等。运行它用 `backend-java/start.bat`。 |
| **backend-java/src/main/java** | 后端 Java 源码：controller、service、entity、配置等。 |
| **backend-java/src/main/resources/static** | 网站版前端的静态文件（由 `build-frontend-and-copy.bat` 从 frontend 拷过来）。浏览器访问后端时看到的页面来自这里。 |
| **database** | SQLite 数据库文件（如 `accounting.db`）和迁移脚本。后端启动时用这里的库。**上架不改动这里。** |
| **docs** | 文档：上架评估、操作指南、目录说明（本文）等。 |
| **build-frontend-and-copy.bat** | 构建前端并把结果拷到 `backend-java/.../static`，用于**网站**访问。和打 App 是两条线。 |
| **一键启动.bat** | **只运行这一个**即可：先构建前端并复制，再启动后端。替代「先运行 build 再运行 start」两步。 |
| **制作发布包.bat** | 生成 **CountingHelper-使用包** 文件夹（内含 JAR、database、启动.bat）。把该文件夹**压缩**发给别人，对方**解压后双击 启动.bat** 即可使用，只需安装 Java，无需 Node/Maven。 |
| **.vscode** | 编辑器配置，与运行/上架无关可忽略。 |
| **backend**、**server** | 若存在，是旧版 Node 后端，**当前运行和上架都不依赖**，可忽略或删除。 |

**总结**：  
- **日常运行**：`backend-java/start.bat` 启动后端，浏览器打开 `http://localhost:8000`（或用 frontend 的 dev 模式）。  
- **上架 Google Play**：只用到 **frontend**（含 frontend/android）和 **后端公网地址**，不动 database、不改业务逻辑。

---

## 二、上架 Google Play 的最简路径（奥卡姆剃刀）

前提：后端已部署到公网并配好 **HTTPS**，得到例如 `https://api.你的域名.com/api`。

### 步骤 1：配置 App 要连的 API 地址

在 **frontend** 目录建 `.env.production`（没有就新建），内容一行：

```env
VITE_API_URL=https://api.你的域名.com/api
```

把 `https://api.你的域名.com/api` 换成你真实的后端地址（必须 HTTPS，且带 `/api`）。

### 步骤 2：把前端打进 Android 工程

在 **frontend** 目录执行（已安装 Node 的前提下）：

```bash
npm install
npm run cap:sync
```

`cap:sync` 会先构建前端（用上面的 API 地址），再同步到 `frontend/android`。以后每次改前端想更新 App，就再执行一次这两句。

### 步骤 3：用 Android Studio 打签名 AAB

1. 打开 Android Studio，**File → Open**，选项目里的 **frontend/android** 文件夹（不要选项目根或 frontend 根）。
2. 菜单 **Build → Generate Signed Bundle / APK**，选 **Android App Bundle**，下一步。
3. 没有密钥就 **Create new** 建一个 keystore（路径、密码、别名记住并保管好），有就选现有。
4. 选 **release**，完成。生成的 AAB 在：  
   `frontend/android/app/build/outputs/bundle/release/app-release.aab`。

### 步骤 4：上传到 Google Play

1. 打开 [Google Play 控制台](https://play.google.com/console)，用开发者账号登录（约 $25 一次性）。
2. 创建应用（若未创建），填应用名称、简短说明、图标、截图等必填项。
3. 在 **发布 → 正式版（或测试版）** 里上传刚才的 **app-release.aab**。
4. 按提示完成内容分级、隐私政策等，提交审核。

审核通过后即可在 Google Play 搜索、安装；用户打开 App 会连你在步骤 1 配置的 API，**不动你现有功能和数据库**。

---

## 三、最少必要清单（不多做、不做少）

| 要做 | 不做 |
|------|------|
| 后端部署到公网 HTTPS | 不重写原生、不改成 PWA 上架、不删 database |
| frontend 里设 `VITE_API_URL` | 不改 backend-java 业务代码 |
| `npm run cap:sync` 更新 android 里的前端 | 不手动改 frontend/android 里的业务逻辑 |
| Android Studio 打开 frontend/android，签名打 AAB | 不装 Cordova、不新建一套原生项目 |
| Play 控制台上传 AAB、填商店信息 | 不重复造轮子 |

按上面四步做完，即可用**最简单的方式**把当前项目以 App 形式上架 Google Play，并保持现有功能和数据库不变。

---

## 四、仅打包发给别人测试安装（不上架 Google Play）

不注册商店、不交费、不审核，只打一个 **APK** 发给他们安装即可。

### 1. 让测试用户能访问到后端

App 里必须填一个**测试用户手机能访问到的** API 地址，二选一即可：

- **同一 WiFi 下**：你在本机运行 `backend-java/start.bat`，在 frontend 里把 API 设成你电脑的局域网 IP，例如：  
  `.env.production` 里写：`VITE_API_URL=http://192.168.1.100:8000/api`  
  （把 `192.168.1.100` 换成你电脑在当前 WiFi 下的 IP，用 `ipconfig` 查。）
- **临时公网**：用 [ngrok](https://ngrok.com) 等把本机 8000 端口暴露成 HTTPS 地址，把该地址写进 `VITE_API_URL`（例如 `https://xxxx.ngrok.io/api`），这样对方不在同一 WiFi 也能用。

### 2. 打 APK（不是 AAB）

在 **frontend** 目录执行：

```bash
npm install
npm run cap:sync
```

用 Android Studio **打开 frontend/android**，菜单 **Build → Generate Signed Bundle / APK**，这次选 **APK**（不选 AAB），用新建或已有 keystore 签名，选 **release**，完成。

生成的 APK 一般在：  
`frontend/android/app/build/outputs/apk/release/app-release.apk`。

### 3. 发给对方安装

把 **app-release.apk** 发给他们（网盘、微信、邮件等）。对方在 Android 手机上下载后点击安装；若提示“不允许未知来源”，在系统设置里允许“来自此来源安装”即可。

**不需要**：Google Play 账号、商店信息、审核、AAB。
