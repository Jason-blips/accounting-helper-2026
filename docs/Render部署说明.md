# Render 部署说明

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
