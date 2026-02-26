# 让服务器常驻运行（Nginx + 后端部署）

目标：把后端部署到一台**一直开着的服务器**上，用 **Nginx** 做反向代理，后端进程用 **systemd** 挂起、开机自启。这样用户（和你）**不用再点一键启动**，直接打开网址或 App 即可使用。

---

## 一、整体结构

```
用户浏览器/App  →  https://你的域名  →  Nginx (80/443)  →  本机 8000 端口 (Spring Boot)
```

- **Nginx**：对外提供 80/443，把请求转发给本机的 Spring Boot（8000）。
- **Spring Boot**：以 systemd 服务方式常驻，挂了自动重启、开机自启。
- 不改你现有代码和数据库结构，只做部署配置。

---

## 二、适用场景

- 你有一台 **Linux 服务器**（本机、VPS、云主机均可），有公网 IP 或域名。
- 或只在**局域网**用：同一 WiFi 下别人访问 `http://你电脑IP` 即可，无需公网。

---

## 三、部署步骤（以 Linux 为例）

### 1. 服务器上安装环境

```bash
# Java 17（以 Ubuntu/Debian 为例）
sudo apt update
sudo apt install openjdk-17-jre-headless

# Nginx
sudo apt install nginx
```

### 2. 准备部署目录和文件

在服务器上建一个目录，例如 `/opt/counting-helper`，放入：

- **counting-helper-backend-1.0.0.jar**（你在本机用「制作发布包」或 `mvn package` 打出来的）
- **database/**（把整个 database 文件夹拷过去，内含 accounting.db 等）

目录示例：

```
/opt/counting-helper/
├── counting-helper-backend-1.0.0.jar
└── database/
    └── accounting.db
```

### 3. 用 systemd 让后端常驻（挂起）

新建服务文件：

```bash
sudo nano /etc/systemd/system/counting-helper.service
```

内容（路径按你实际改）：

```ini
[Unit]
Description=Tally Drop 落记 Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/counting-helper
Environment="DB_PATH=/opt/counting-helper/database/accounting.db"
ExecStart=/usr/bin/java -jar /opt/counting-helper/counting-helper-backend-1.0.0.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动服务（**服务器挂起 = 一直跑这个服务**）：

```bash
sudo systemctl daemon-reload
sudo systemctl enable counting-helper
sudo systemctl start counting-helper
sudo systemctl status counting-helper
```

以后重启服务器也会自动起来，无需再点一键启动。

### 4. 配置 Nginx 反向代理

新建站点配置：

```bash
sudo nano /etc/nginx/sites-available/counting-helper
```

内容（仅 HTTP 时）：

```nginx
server {
    listen 80;
    server_name 你的域名或服务器IP;   # 例如 counting.你的域名.com 或 192.168.1.100

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用并重载 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/counting-helper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

此时访问 `http://你的域名或IP` 就会转到本机 8000，前端和接口都由 Spring Boot 提供，**无需再在本机点一键启动**。

### 5. 可选：HTTPS（用 Let's Encrypt）

有域名且希望用 HTTPS 时：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

证书会自动续期，Nginx 会改为监听 443 并转发到本机 8000。

---

## 四、这样做了之后

| 之前 | 之后 |
|------|------|
| 每次用都要在本机点「一键启动」 | 服务器上后端一直跑，你/用户**直接打开网址**或 App |
| 后端只在你电脑上、关了就没法用 | 后端在服务器上**挂起**，24 小时可访问 |

- **网页**：浏览器打开 `http://服务器IP或域名`（或 `https://...`）即可。
- **手机 App**：把 App 里的 API 地址配成 `https://你的域名/api`，点开 App 就能用，不需要再运行任何脚本。

---

## 五、简要对照

- **Nginx 的作用**：对外 80/443，把请求转给本机 8000，可选做 HTTPS 和域名。
- **服务器挂起**：用 **systemd** 跑 JAR，`Restart=always` + `enable`，进程常驻、开机自启。
- 不改你现有功能与数据库，只是把「本机一键启动」换成「服务器上一直跑 + Nginx 转发」。

这样你的服务就相当于「挂在服务器上」，用户点开就能用，和用应用商店的 App 体验一致（只是入口是浏览器或你打包的 App）。
