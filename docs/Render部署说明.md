# Render 部署说明

## 数据持久化（重要：避免重新部署后数据丢失）

**原因**：Render 的 Web Service 每次重新部署都会新建容器，容器内文件系统是**临时的**，重启/再部署后之前写入的 SQLite 数据库会丢失，用户账号和交易记录都会没掉。

**做法**：用 **Render 持久化盘（Disk）** 存数据库，让应用把库写在挂载盘上。

### 步骤

1. **创建 Disk**  
   - 在 Render Dashboard 左侧选 **Disks** → **New Disk**。  
   - 名称随意（如 `counting-helper-data`），大小选 1 GB 即可，和当前 Web Service 选同一 Region。  
   - 创建后记下 **Mount Path**（例如 `/data`）。

2. **把 Disk 挂到 Web Service**  
   - 打开你的 Web Service → **Settings** → **Disks**。  
   - 点 **Add Disk**，选择刚建的 Disk，Mount Path 用默认（如 `/data`）即可。

3. **让应用用挂载盘上的数据库**  
   - 同一 Web Service → **Environment**，添加环境变量：  
     - **Key**：`DB_PATH`  
     - **Value**：`/data/accounting.db`（若 Mount Path 是 `/data`；若是别的路径则改成 `你的MountPath/accounting.db`）。  
   - 保存后**重新部署**一次，之后数据库就会写在持久化盘上，重新部署也不会丢数据。

4. **首次部署**  
   - 第一次加 Disk 并设好 `DB_PATH` 后部署，应用会在 `/data/accounting.db` 自动建库、建表；若开启了 `INIT_ADMIN_ENABLED` 会创建初始管理员。  
   - 之后每次部署都是**同一个文件**，用户和数据都会保留。

### 小结

| 不做持久化 | 做持久化（Disk + DB_PATH） |
|-----------|----------------------------|
| 每次部署 = 新容器，数据库在容器内，部署后数据全丢 | 数据库在 Disk 上，部署只换应用，数据保留 |

---

## 为何出现 “No open ports detected” / “Deploy cancelled”

1. **启动时间较长**：Spring Boot + JPA + SQLite 首次启动约 **50 秒** 属正常。Render 会持续扫描端口，直到检测到服务在 `PORT`（默认 10000）上监听。
2. **健康检查路径**：若未配置或配置错误，Render 可能认为服务未就绪。请务必设置 **Health Check Path**。
3. **“Deploy cancelled”**：可能是手动取消，或新实例在零停机部署时连续 15 分钟健康检查失败被自动取消。正确配置健康检查可避免误判。

## 必做配置（Dashboard）

在 Render 的 Web Service → **Settings** 中：

| 配置项 | 建议值 | 说明 |
|--------|--------|------|
| **Health Check Path** | `/api/health` | 后端健康接口，返回 200 + `{"status":"healthy"}`。必须填此项。 |
| **Port** | 留空或 10000 | Render 会注入 `PORT` 环境变量，应用已使用 `server.port=${PORT:8000}`，无需改。 |

无需单独设置 `PORT` 环境变量，Render 会自动注入。

## 可选：加快启动（已默认开启）

`application.yml` 中已启用延迟初始化：

```yaml
spring.main.lazy-initialization: ${LAZY_INIT:true}
```

首请求会略慢，但整体启动更快，有利于在 Render 上尽早通过端口/健康检查。若希望本地启动时也更快，可设环境变量 `LAZY_INIT=true`（默认即为 true）。

## 健康检查接口说明

- **`GET /api/health`**：无需 token，返回 `200`，body `{"status":"healthy"}`。建议用作 Render 控制台的 **Health Check Path**（部署就绪检测）。
- **`GET /api/ping`**：无需 token，返回 `200`，body 纯文本 `ok`，专门用于保活/唤醒；定时请求此接口即可避免免费实例休眠。

确保 Render 的 Health Check Path 为 **`/api/health`**（不要带域名或 `/api` 前缀以外的路径）。

## 若仍部署失败

1. 查看 Render **Logs**：确认是否有 “Tomcat started on port 10000” 和 “Tally Drop 落记 Backend Started!”。
2. 若端口已启动但仍失败：检查 **Health Check Path** 是否为 `/api/health`，且无多余斜杠或拼写错误。
3. 若为 Blueprint 部署：可参考项目根目录 `render.yaml` 中的 `healthCheckPath` 配置。

---

## 免费版保活（避免服务休眠）

Render 免费版在约 **15 分钟**无请求后会自动休眠，下次访问需冷启动（约 30 秒～1 分钟）。通过**定时请求**后端可保持服务常驻。

项目已提供两种方式，任选其一即可。

### 方式一：GitHub Actions（推荐，无需常开电脑）

1. 打开仓库 **Settings** → **Secrets and variables** → **Actions**。
2. 点 **New repository secret**，名称填 **`RENDER_APP_URL`**，值填后端根地址，例如：
   - `https://your-app-name.onrender.com`  
   （不要带 `/api` 或末尾斜杠）
3. 推送代码后，工作流 **Render Keep-Alive** 会按计划每 14 分钟请求一次 `{RENDER_APP_URL}/api/ping`（保活专用接口，返回 `ok`）。
4. 可在 **Actions** 页手动运行一次 **Render Keep-Alive** 做测试。

工作流文件：`.github/workflows/render-keepalive.yml`。

### 方式二：本地脚本（需本机或服务器常运行）

在项目根目录执行（需 Node 18+）：

```bash
# 方式 A：环境变量
set RENDER_APP_URL=https://your-app-name.onrender.com
node scripts/render-keepalive.js

# 方式 B：命令行参数
node scripts/render-keepalive.js https://your-app-name.onrender.com
```

脚本会请求后端的 **`/api/ping`** 接口（返回纯文本 `ok`，无需登录），立即执行一次，之后每 14 分钟一次。可通过环境变量 `KEEPALIVE_INTERVAL_MS` 修改间隔（单位毫秒）。

### 保活原理说明

- 后端已提供 **`GET /api/ping`**：无需登录，请求即返回 `200` 和 body `ok`，专门用于被定时调用。
- 只要在约 15 分钟内有一次成功请求到达 Render，免费实例就不会休眠；定时请求 `/api/ping` 即可实现“一直被唤醒”。
- Render 控制台里的 **Health Check Path** 仍建议用 **`/api/health`**（用于部署时的就绪检测）；保活用 **`/api/ping`** 即可。
