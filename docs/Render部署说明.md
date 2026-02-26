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

- **路径**：`GET /api/health`
- **认证**：无需 token，已在 Security 中放行。
- **响应**：`200 OK`，body 为 `{"status":"healthy"}`。

确保 Render 的 Health Check Path 为 **`/api/health`**（不要带域名或 `/api` 前缀以外的路径）。

## 若仍部署失败

1. 查看 Render **Logs**：确认是否有 “Tomcat started on port 10000” 和 “Counting Helper Backend Started!”。
2. 若端口已启动但仍失败：检查 **Health Check Path** 是否为 `/api/health`，且无多余斜杠或拼写错误。
3. 若为 Blueprint 部署：可参考项目根目录 `render.yaml` 中的 `healthCheckPath` 配置。
