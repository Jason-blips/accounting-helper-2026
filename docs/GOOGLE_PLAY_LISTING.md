# Google Play 商店信息（Counting Helper）

发布到 Google Play 时，在 Play Console 中填写以下内容可作参考。

---

## 应用名称（App name）

**Counting Helper**

（或：Counting Helper - 智能记账）

---

## 简短说明（Short description，80 字符以内）

**示例（英文）：**  
Track income & expenses, multi-currency, AI tips. Simple personal bookkeeping.

**示例（中文）：**  
记录收支、多币种、AI 建议。简单个人记账。

---

## 完整说明（Full description，4000 字符以内）

**示例（英文）：**

Counting Helper helps you track daily income and expenses in one place.

• **Quick entries** – Add income or expense with amount, currency, category, and payment method.  
• **Multi-currency** – Support for GBP, CNY, USD, EUR with conversion.  
• **Dashboard** – See total income, total expense, and balance at a glance.  
• **Charts** – Visualize trends over time.  
• **AI analysis** – Get spending insights and saving suggestions (optional).  
• **Your data** – Secure account; data stays yours.

Ideal for personal budgeting and expense tracking. Free to use.

**示例（中文）：**

Counting Helper 帮你在一处记录每日收支。

• **快速记账** – 记录收入或支出，支持金额、币种、分类与支付方式。  
• **多币种** – 支持 GBP、CNY、USD、EUR 及汇率转换。  
• **概览** – 总收入、总支出与余额一目了然。  
• **图表** – 趋势可视化。  
• **AI 分析** – 消费洞察与省钱建议（可选）。  
• **数据安全** – 独立账号，数据归属用户。

适合个人预算与日常记账，免费使用。

---

## 隐私政策（Privacy policy）

Google Play 要求提供可公开访问的**隐私政策 URL**。

- 若你已有网站，可放例如：`https://yourdomain.com/privacy`  
- 若暂无网站，可使用 GitHub Pages、Notion 公开页、或任意可公开访问的链接。

在 **frontend** 构建 App 时，可设置环境变量：

```env
VITE_PRIVACY_URL=https://yourdomain.com/privacy
```

这样应用内「关于」页会显示隐私政策链接。

---

## 应用类别（Category）

建议选择：**财务（Finance）** 或 **效率（Productivity）**。

---

## 内容分级（Content rating）

填写问卷时，一般可勾选：无暴力、无不当内容、无赌博等，获得较低年龄分级（如 3+ 或 7+）。

---

## 应用图标与截图

- **图标**：至少 512×512 PNG，无透明通道（Google 要求）。  
  当前 Android 工程使用默认图标，可在 `android/app/src/main/res/` 下替换为你的品牌图标。  
- **截图**：至少 2 张，建议 16:9 或 9:16，展示登录、概览、记账等界面。  
- 可选：Feature Graphic 1024×500，用于商店顶部横幅。

---

## 版本与包名

- **versionName**：在 `frontend/android/app/build.gradle` 的 `defaultConfig.versionName` 中设置（如 `"1.0.0"`）。  
- **versionCode**：每次上传新包时递增 `versionCode`（如 1, 2, 3…）。  
- **applicationId**：`com.countinghelper.app`（与 `capacitor.config.ts` 中 `appId` 一致）。
