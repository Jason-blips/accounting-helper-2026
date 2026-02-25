const axios = require('axios');

// 压力测试配置
const CONFIG = {
  baseURL: 'http://localhost:8000',
  concurrentUsers: 10,  // 并发用户数
  requestsPerUser: 20,  // 每个用户的请求数
  testDuration: 30,      // 测试持续时间（秒）
  endpoints: [
    { path: '/api/health', method: 'GET', weight: 10 },
    { path: '/api/transactions/stats/summary', method: 'GET', weight: 5, auth: true },
    { path: '/api/transactions', method: 'GET', weight: 8, auth: true },
  ]
};

// 测试用户token（需要先登录获取）
let testToken = null;
let testUserId = null;

// 统计信息
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: Date.now(),
  endTime: null
};

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      username: 'manager',
      password: 'SecurPass2026!'
    });
    testToken = response.data.token;
    testUserId = response.data.user.id;
    console.log('✅ 登录成功，获取到token');
    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

// 发送单个请求
async function sendRequest(endpoint) {
  const startTime = Date.now();
  stats.totalRequests++;
  
  try {
    const config = {
      method: endpoint.method,
      url: `${CONFIG.baseURL}${endpoint.path}`,
      timeout: 10000
    };
    
    if (endpoint.auth && testToken) {
      config.headers = {
        'Authorization': `Bearer ${testToken}`
      };
    }
    
    const response = await axios(config);
    const duration = Date.now() - startTime;
    stats.responseTimes.push(duration);
    stats.successfulRequests++;
    
    return { success: true, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - startTime;
    stats.responseTimes.push(duration);
    stats.failedRequests++;
    stats.errors.push({
      endpoint: endpoint.path,
      error: error.message,
      status: error.response?.status
    });
    
    return { success: false, duration, error: error.message };
  }
}

// 模拟单个用户
async function simulateUser(userId) {
  const results = [];
  
  for (let i = 0; i < CONFIG.requestsPerUser; i++) {
    // 根据权重随机选择endpoint
    const totalWeight = CONFIG.endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedEndpoint = null;
    
    for (const endpoint of CONFIG.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        selectedEndpoint = endpoint;
        break;
      }
    }
    
    const result = await sendRequest(selectedEndpoint);
    results.push(result);
    
    // 随机延迟（模拟真实用户行为）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
  
  return results;
}

// 运行压力测试
async function runLoadTest() {
  console.log('🚀 开始压力测试...\n');
  console.log(`配置:`);
  console.log(`  - 并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`  - 每用户请求数: ${CONFIG.requestsPerUser}`);
  console.log(`  - 总请求数: ${CONFIG.concurrentUsers * CONFIG.requestsPerUser}`);
  console.log(`  - 测试端点: ${CONFIG.endpoints.length}个\n`);
  
  // 先登录
  if (!await login()) {
    console.error('无法登录，测试终止');
    process.exit(1);
  }
  
  // 开始测试
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    promises.push(simulateUser(i + 1));
  }
  
  // 显示进度
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const rps = stats.totalRequests / elapsed;
    process.stdout.write(`\r⏱️  已发送: ${stats.totalRequests} 请求 | 成功率: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}% | RPS: ${rps.toFixed(1)}`);
  }, 500);
  
  await Promise.all(promises);
  clearInterval(progressInterval);
  
  stats.endTime = Date.now();
  const duration = (stats.endTime - stats.startTime) / 1000;
  
  // 计算统计信息
  const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
  const avgTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
  const minTime = Math.min(...stats.responseTimes);
  const maxTime = Math.max(...stats.responseTimes);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  // 显示结果
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 压力测试结果');
  console.log('='.repeat(60));
  console.log(`总请求数: ${stats.totalRequests}`);
  console.log(`成功请求: ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`失败请求: ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`测试时长: ${duration.toFixed(2)}秒`);
  console.log(`平均RPS: ${(stats.totalRequests / duration).toFixed(2)} 请求/秒`);
  console.log(`\n响应时间统计:`);
  console.log(`  最小: ${minTime}ms`);
  console.log(`  最大: ${maxTime}ms`);
  console.log(`  平均: ${avgTime.toFixed(2)}ms`);
  console.log(`  P50: ${p50}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  P99: ${p99}ms`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ 错误详情 (前10个):`);
    stats.errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.endpoint}: ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // 估算最大并发用户数
  const maxConcurrentEstimate = Math.floor((stats.successfulRequests / duration) * 2);
  console.log(`\n💡 性能评估:`);
  console.log(`  估计最大并发用户数: ${maxConcurrentEstimate} (基于当前测试结果)`);
  console.log(`  建议并发用户数: ${Math.floor(maxConcurrentEstimate * 0.7)} (安全值)`);
  
  process.exit(0);
}

// 运行测试
runLoadTest().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
