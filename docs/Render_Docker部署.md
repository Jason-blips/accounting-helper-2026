# Render 上用 Docker 部署后端（解决 JAVA_HOME 报错）

Render 默认使用 **Node.js** 环境，没有 Java，所以直接跑 `./mvnw` 会报错：**JAVA_HOME environment variable is not defined correctly**。  
解决办法：用 **Docker** 构建并运行后端，由镜像内自带 JDK/JRE。

---

## 一、项目里已有什么

- **backend-java/Dockerfile**：多阶段构建（JDK 17 编译 → JRE 17 运行），端口 8000。
- **backend-java/.dockerignore**：忽略 `target/`、`.git` 等，加快构建。

---

## 二、在 Render 上的设置

1. **New → Web Service**，连到你的 GitHub 仓库（例如 `accounting-helper-2026` 或 `counting-helper`）。

2. **Root Directory**（重要）  
   - 若仓库**只包含后端**（根目录就有 `pom.xml`、`mvnw`、`Dockerfile`）：留空即可。  
   - 若仓库是**整个项目**（含 frontend、backend-java 等）：填 **`backend-java`**，这样构建上下文才是后端目录。

3. **Environment**：选 **Docker**（不要选 Node 或 Java）。

4. **Build / Start**  
   - 选 Docker 后，Render 会用当前上下文里的 `Dockerfile` 执行 `docker build` 和 `docker run`，一般**不用再填 Build Command / Start Command**。

5. **Instance 端口与「No open ports detected」**  
   - 应用已使用 `server.port=${PORT:8000}` 且 `server.address=0.0.0.0`，Render 注入的 **PORT** 会自动生效。  
   - 已做**启动加速**（延迟初始化 + JVM 参数），启动时间会缩短；Render 在启动过程中仍可能报 **No open ports detected, continuing to scan...**，属正常。等日志出现 **Tomcat started on port 10000**（或当前 PORT）和 **Your service is live** 即表示已就绪。**不要在中途点「Deploy cancelled」**，否则会中断部署。

6. **环境变量**  
   - **DDL_AUTO=update**：首次部署或容器内没有现成数据库时必设，应用会按实体自动建表（如 `users`）。不设则默认为 `none`，若没有库会报「no such table: users」。  
   - **默认不创建**任何初始管理员，所有用户通过**注册**使用。若你希望空库下有一个初始管理员，可额外设 `INIT_ADMIN_ENABLED=true` 及可选 `INIT_ADMIN_USERNAME` / `INIT_ADMIN_PASSWORD`。  
   - **DB_PATH**（可选）：数据库文件路径，默认容器内为 `/app/data/accounting.db`。**若希望重新部署后账号不丢失，必须使用持久化盘（见下方）。**  
   - **启动加速**（可选）：应用已默认开启延迟初始化与 JVM 启动优化，部署会更快。若需关闭延迟初始化可设 `LAZY_INIT=false`；自定义 JVM 参数可设 `JAVA_OPTS`（默认含 `-XX:TieredStopAtLevel=1`）。

7. **数据持久化（重新部署后账号不丢失）**  
   - Render 每次重新部署会重建容器，容器内 `/app/data/` 会清空，导致**之前注册的账号丢失**。  
   - 解决：在 Render 的该 Web Service 里添加 **Persistent Disk**：  
     - 在服务页 **Disks** 中 **Add Disk**，命名如 `counting-helper-data`，大小选 1 GB 即可。  
     - **Mount Path** 填：`/data`（或 `/app/data`，与下面 DB_PATH 一致即可）。  
     - 在 **Environment** 中增加：**DB_PATH** = `/data/accounting.db`（若挂载路径是 `/app/data` 则填 `/app/data/accounting.db`）。  
   - 这样数据库文件会写在持久化盘上，重新部署后数据保留，账号不会丢失。

8. 保存后 **Deploy**，等镜像构建并启动即可。用户需先注册再登录使用。

---

## 三、若仍失败可检查

- **Root Directory** 是否指向包含 `Dockerfile` 和 `mvnw` 的目录（整仓库时填 `backend-java`）。  
- Render 日志里是否还有权限错误：Dockerfile 里已 `chmod +x mvnw`，一般可避免 Permission denied。  
- **not implemented by SQLite JDBC driver**：所有「插入并取自增 ID」的逻辑已改为 JdbcTemplate + `last_insert_rowid()`（注册、默认管理员、周期预算新建等），请确保已部署最新代码。  
- 需要公网访问时，记得用 Render 提供的 HTTPS 地址（或自己的域名）作为前端的 API 地址（如 `VITE_API_URL`）。
