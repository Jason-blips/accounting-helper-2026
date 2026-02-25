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

5. **Instance 端口**  
   - 应用已使用 `server.port=${PORT:8000}`，Render 注入的 **PORT** 会自动生效，无需再填 Start Command。

6. **环境变量（重要）**  
   - **DDL_AUTO=update**：首次部署或容器内没有现成数据库时必设。应用会按实体自动建表（如 `users`），并创建默认管理员 **admin / admin123**。不设则默认为 `none`，若没有库会报「no such table: users」。  
   - **DB_PATH**（可选）：数据库文件路径，默认容器内为 `/app/data/accounting.db`。若挂载了持久化磁盘，可设到该磁盘路径。

7. 保存后 **Deploy**，等镜像构建并启动即可。首次启动后可用 admin / admin123 登录。

---

## 三、若仍失败可检查

- **Root Directory** 是否指向包含 `Dockerfile` 和 `mvnw` 的目录（整仓库时填 `backend-java`）。  
- Render 日志里是否还有权限错误：Dockerfile 里已 `chmod +x mvnw`，一般可避免 Permission denied。  
- 需要公网访问时，记得用 Render 提供的 HTTPS 地址（或自己的域名）作为前端的 API 地址（如 `VITE_API_URL`）。
