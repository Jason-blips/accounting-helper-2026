#!/usr/bin/env node
/**
 * Render 免费版保活脚本：定时请求后端 /api/health，避免服务休眠。
 *
 * 用法：
 *   node scripts/render-keepalive.js
 *   node scripts/render-keepalive.js https://your-app.onrender.com
 *   RENDER_APP_URL=https://your-app.onrender.com node scripts/render-keepalive.js
 *
 * 环境变量：
 *   RENDER_APP_URL - 后端根地址（必填，若未通过参数传入）
 *   KEEPALIVE_INTERVAL_MS - 间隔毫秒数，默认 14 * 60 * 1000（14 分钟）
 */

const INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS) || 14 * 60 * 1000; // 14 min
const BASE = process.env.RENDER_APP_URL || process.argv[2];

function getUrl() {
  if (!BASE || typeof BASE !== 'string') return null;
  const base = BASE.replace(/\/+$/, '');
  return `${base}/api/ping`;
}

function ping() {
  const url = getUrl();
  if (!url) {
    console.error('请设置 RENDER_APP_URL 或传入后端地址，例如:');
    console.error('  RENDER_APP_URL=https://your-app.onrender.com node scripts/render-keepalive.js');
    process.exit(1);
  }
  fetch(url, { method: 'GET', signal: AbortSignal.timeout(60000) })
    .then((res) => {
      if (res.ok) console.log(`[${new Date().toISOString()}] ${url} -> ${res.status}`);
      else console.warn(`[${new Date().toISOString()}] ${url} -> ${res.status}`);
    })
    .catch((err) => console.warn(`[${new Date().toISOString()}] ${url} 失败:`, err.message));
}

console.log(`保活间隔: ${INTERVAL_MS / 60000} 分钟，目标: ${getUrl() || '(未配置)'}`);
ping();
setInterval(ping, INTERVAL_MS);
