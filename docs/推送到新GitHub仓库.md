# 把项目推送到新的 GitHub 仓库

当前项目**已经是 Git 仓库**，远程为：`https://github.com/Jason-blips/counting-helper.git`。  
若要放到**全新**的 GitHub 仓库，按下面步骤做。

---

## 一、在 GitHub 上创建新仓库

1. 登录 [GitHub](https://github.com)，右上角 **+** → **New repository**。
2. 填写：
   - **Repository name**：例如 `counting-helper` 或你起的名字。
   - **Public** / **Private** 自选。
   - **不要**勾选 "Add a README"、"Add .gitignore"（本地已有）。
3. 点 **Create repository**。  
   创建好后会看到仓库地址，例如：`https://github.com/你的用户名/新仓库名.git`。

---

## 二、在本机把当前项目指向新仓库并推送

在项目根目录（`Counting Helper`）打开 **PowerShell** 或 **CMD**，依次执行：

```bash
cd "c:\Users\12527\code\Counting Helper"

REM 把原来的远程改名为 old（保留备份，可选）
git remote rename origin old

REM 添加新仓库为 origin（把下面的 URL 换成你的新仓库地址）
git remote add origin https://github.com/你的用户名/新仓库名.git

REM 推送当前分支到新仓库
git push -u origin main
```

若你**不想保留旧远程**，可以直接删掉再加新的：

```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/新仓库名.git
git push -u origin main
```

把 `https://github.com/你的用户名/新仓库名.git` 换成你在第一步创建的新仓库的 **HTTPS** 地址。

---

## 三、推送前建议先整理提交

当前有未提交的修改和未跟踪文件。若希望新仓库里是「干净的一版」：

1. **提交所有要保留的改动**（按需选择）：
   ```bash
   git add .
   git status
   git commit -m "Sync: 完整项目含 backend-java、frontend、docs、APK 构建等"
   ```

2. **再执行第二节的** `git remote` 和 `git push -u origin main`。

若只想先推现有提交、不包含未提交文件，则**不要** `git add .`，直接改 remote 并 `git push` 即可（新仓库里会是当前已提交的内容）。

---

## 四、说明

- **.gitignore** 已更新：会忽略 `node_modules/`、`frontend/dist/`、`backend-java/target/`、`.env.production`、部分 Android 构建与 IDE 配置，避免把无关和敏感文件推上去。
- 推送后，新仓库的默认分支即为 **main**，之后开发在新仓库上继续即可。
