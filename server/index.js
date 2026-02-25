const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { join } = require('path');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const axios = require('axios');

// 加载环境变量
const __dirname_server = __dirname;
dotenv.config({ path: join(__dirname_server, '.env') });

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'counting-helper-secret-key-change-in-production';

// 性能监控
const performanceStats = {
  totalRequests: 0,
  activeRequests: 0,
  maxConcurrent: 0,
  responseTimes: [],
  errors: 0,
  startTime: Date.now()
};

// 请求监控中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  performanceStats.totalRequests++;
  performanceStats.activeRequests++;
  if (performanceStats.activeRequests > performanceStats.maxConcurrent) {
    performanceStats.maxConcurrent = performanceStats.activeRequests;
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceStats.responseTimes.push(duration);
    performanceStats.activeRequests--;
    
    // 只保留最近1000个响应时间
    if (performanceStats.responseTimes.length > 1000) {
      performanceStats.responseTimes.shift();
    }
    
    if (res.statusCode >= 400) {
      performanceStats.errors++;
    }
  });
  
  next();
});

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL || '*' : '*',
  credentials: true,
}));

// 增加JSON解析限制（支持更大的请求体）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 数据库路径
const dbPath = join(__dirname_server, '..', 'database', 'accounting.db');
const dbDir = path.dirname(dbPath);

// 确保database目录存在
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 初始化数据库 - 启用WAL模式支持并发读写
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功');
    
    // 启用WAL模式（Write-Ahead Logging）提高并发性能
    db.run('PRAGMA journal_mode = WAL;', (err) => {
      if (err) {
        console.warn('⚠️  启用WAL模式失败:', err.message);
      } else {
        console.log('✅ WAL模式已启用（支持并发读写）');
      }
    });
    
    // 优化SQLite性能设置
    db.serialize(() => {
      // 设置同步模式为NORMAL（平衡性能和安全性）
      db.run('PRAGMA synchronous = NORMAL;');
      // 设置缓存大小为10MB
      db.run('PRAGMA cache_size = -10000;');
      // 启用外键约束
      db.run('PRAGMA foreign_keys = ON;');
      // 设置忙等待超时（毫秒）
      db.configure('busyTimeout', 5000);
    });
    
    initDatabase();
  }
});

// 数据库连接池管理（虽然SQLite是单文件，但我们可以优化连接管理）
let activeConnections = 0;
const MAX_CONCURRENT_QUERIES = 50; // 最大并发查询数
const queryQueue = [];
let processingQueue = false;

// 数据库查询包装器，支持队列管理
function dbQuery(method, ...args) {
  return new Promise((resolve, reject) => {
    if (activeConnections >= MAX_CONCURRENT_QUERIES) {
      queryQueue.push({ method, args, resolve, reject });
      return;
    }
    
    activeConnections++;
    const callback = (err, result) => {
      activeConnections--;
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
      
      // 处理队列中的下一个查询
      if (queryQueue.length > 0 && !processingQueue) {
        processingQueue = true;
        const next = queryQueue.shift();
        setTimeout(() => {
          dbQuery(next.method, ...next.args)
            .then(next.resolve)
            .catch(next.reject)
            .finally(() => {
              processingQueue = false;
            });
        }, 10);
      }
    };
    
    if (method === 'get') {
      db.get(...args, callback);
    } else if (method === 'all') {
      db.all(...args, callback);
    } else if (method === 'run') {
      db.run(...args, function(err) {
        callback(err, { lastID: this.lastID, changes: this.changes });
      });
    } else {
      reject(new Error('Unknown method: ' + method));
    }
  });
}

// 初始化数据库表
function initDatabase() {
  db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('创建用户表失败:', err);
      } else {
        // 检查是否需要添加role列（兼容旧数据库）
        db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (alterErr) => {
          // 忽略错误（如果列已存在）
        });
        
        // 创建管理员账户（如果不存在）
        createAdminUser();
      }
    });

    // 交易表
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      amount_in_gbp REAL NOT NULL,
      description TEXT,
      category TEXT,
      payment_method TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, () => {
      // 创建索引优化查询性能
      db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);');
      db.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);');
      db.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
      console.log('✅ 数据库索引已创建');
    });

    console.log('✅ 数据库表初始化完成');
  });
}

// 创建管理员账户
function createAdminUser() {
  const adminUsername = 'manager';
  const adminPassword = 'SecurPass2026!';
  
  db.get('SELECT id FROM users WHERE username = ?', [adminUsername], (err, row) => {
    if (err) {
      console.error('检查管理员账户失败:', err);
      return;
    }
    
    if (!row) {
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          console.error('加密管理员密码失败:', err);
          return;
        }
        
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [adminUsername, hash, 'admin'],
          (err) => {
            if (err) {
              console.error('创建管理员账户失败:', err);
            } else {
              console.log('✅ 管理员账户创建成功');
              console.log(`   用户名: ${adminUsername}`);
              console.log(`   密码: ${adminPassword}`);
            }
          }
        );
      });
    } else {
      // 确保现有账户是管理员
      db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', adminUsername], (err) => {
        if (!err) {
          console.log('✅ 管理员账户已存在');
        }
      });
    }
  });
}

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'TOKEN_MISSING' }); // 使用错误代码，前端静默处理
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token过期或无效，返回401状态码，前端会静默重定向
      return res.status(401).json({ error: 'TOKEN_EXPIRED' }); // 使用错误代码，前端静默处理
    }
    req.user = user;
    next();
  });
};

// 管理员权限检查中间件
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '未授权' });
  }
  
  // 从数据库获取用户角色
  db.get('SELECT role FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '查询用户权限失败' });
    }
    
    if (!row || row.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    next();
  });
};

// ==================== 认证路由 ====================

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '用户名已存在' });
          }
          return res.status(500).json({ error: '注册失败' });
        }

        const token = jwt.sign(
          { id: this.lastID, username },
          JWT_SECRET,
          { expiresIn: '30d' } // 延长到30天
        );

        res.status(201).json({
          message: '注册成功',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
// 登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  db.get(
    'SELECT id, username, password, email, COALESCE(role, \'user\') as role, created_at FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        console.error('登录查询失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

        const token = jwt.sign(
          { id: user.id, username: user.username },
          JWT_SECRET,
          { expiresIn: '30d' } // 延长到30天
        );

      // 确保role字段存在且有效
      const userRole = (user.role && user.role !== 'null' && user.role !== '') ? user.role : 'user';
      
      console.log('🔐 [登录] 用户登录成功:', {
        id: user.id,
        username: user.username,
        role: userRole,
        rawRole: user.role
      });
      
      res.json({
        message: '登录成功',
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email || null,
          role: userRole  // 确保role字段总是存在且有效
        }
      });
    }
  );
});

// 获取当前用户
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, COALESCE(role, \'user\') as role, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('获取用户信息失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      // 确保role字段存在，如果没有则默认为'user'
      const userRole = (user.role && user.role !== 'null' && user.role !== '') ? user.role : 'user';
      
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email || null,
        role: userRole,  // 确保role字段总是存在且有效
        created_at: user.created_at
      };
      
      console.log('📋 [API /auth/me] 返回用户信息:', {
        id: userResponse.id,
        username: userResponse.username,
        role: userResponse.role,
        rawRole: user.role
      });
      
      res.json(userResponse);
    }
  );
});

// ==================== 交易路由 ====================

// 创建交易
app.post('/api/transactions', authenticateToken, (req, res) => {
  const {
    amount,
    currency,
    description,
    category,
    payment_method,
    transaction_type,
    created_at
  } = req.body;

  if (!amount || !currency || !payment_method || !transaction_type) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  // 货币转换（简化版，实际应该调用汇率API）
  const exchangeRates = {
    GBP: 1,
    CNY: 0.11,
    USD: 0.79,
    EUR: 0.86
  };
  const amountInGBP = amount * (exchangeRates[currency] || 1);

  // 处理日期
  let transactionDate = created_at || new Date().toISOString();
  if (transactionDate && !transactionDate.includes('T')) {
    transactionDate = transactionDate + 'T12:00:00';
  }

  db.run(
    `INSERT INTO transactions 
     (user_id, amount, currency, amount_in_gbp, description, category, payment_method, transaction_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      amount,
      currency,
      amountInGBP,
      description || null,
      category || null,
      payment_method,
      transaction_type,
      transactionDate
    ],
    function(err) {
      if (err) {
        console.error('创建交易失败:', err);
        return res.status(500).json({ error: '创建交易失败' });
      }

      res.status(201).json({
        id: this.lastID,
        message: '交易创建成功'
      });
    }
  );
});

// 获取交易列表
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { date } = req.query;
  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [req.user.id];

  if (date) {
    query += " AND DATE(created_at) = ?";
    params.push(date);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: '获取交易失败' });
    }
    res.json(transactions);
  });
});

// 更新交易
app.put('/api/transactions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    amount,
    currency,
    description,
    category,
    payment_method,
    transaction_type,
    created_at
  } = req.body;

  // 验证交易属于当前用户
  db.get(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    (err, transaction) => {
      if (err) {
        return res.status(500).json({ error: '服务器错误' });
      }
      if (!transaction) {
        return res.status(404).json({ error: '交易不存在' });
      }

      // 货币转换
      const exchangeRates = {
        GBP: 1,
        CNY: 0.11,
        USD: 0.79,
        EUR: 0.86
      };
      const amountInGBP = amount * (exchangeRates[currency] || 1);

      // 处理日期
      let transactionDate = created_at || transaction.created_at;
      if (transactionDate && !transactionDate.includes('T')) {
        transactionDate = transactionDate + 'T12:00:00';
      }

      db.run(
        `UPDATE transactions 
         SET amount = ?, currency = ?, amount_in_gbp = ?, description = ?, 
             category = ?, payment_method = ?, transaction_type = ?, created_at = ?
         WHERE id = ? AND user_id = ?`,
        [
          amount,
          currency,
          amountInGBP,
          description || null,
          category || null,
          payment_method,
          transaction_type,
          transactionDate,
          id,
          req.user.id
        ],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '更新交易失败' });
          }
          res.json({ message: '交易更新成功' });
        }
      );
    }
  );
});

// 删除交易
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '删除交易失败' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '交易不存在' });
      }
      res.json({ message: '交易删除成功' });
    }
  );
});

// 获取统计摘要
app.get('/api/transactions/stats/summary', authenticateToken, (req, res) => {
  db.all(
    `SELECT 
      transaction_type,
      SUM(amount_in_gbp) as total,
      COUNT(*) as count
     FROM transactions 
     WHERE user_id = ?
     GROUP BY transaction_type`,
    [req.user.id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: '获取统计失败' });
      }

      const income = results.find(r => r.transaction_type === '收入')?.total || 0;
      const expense = results.find(r => r.transaction_type === '支出')?.total || 0;
      const balance = income - expense;

      res.json({
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        balance: balance.toFixed(2),
        incomeCount: results.find(r => r.transaction_type === '收入')?.count || 0,
        expenseCount: results.find(r => r.transaction_type === '支出')?.count || 0
      });
    }
  );
});

// ==================== AI分析路由 ====================

app.post('/api/analysis', authenticateToken, async (req, res) => {
  const { period = 'all' } = req.body;

  console.log(`[AI分析] 时间段: ${period}`);

  // 获取交易数据
  let dateFilter = '';
  const params = [req.user.id];

  if (period === 'day') {
    dateFilter = " AND DATE(created_at) = DATE('now')";
  } else if (period === '3days') {
    dateFilter = " AND DATE(created_at) >= DATE('now', '-3 days')";
  } else if (period === 'week') {
    dateFilter = " AND DATE(created_at) >= DATE('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = " AND DATE(created_at) >= DATE('now', '-30 days')";
  }

  db.all(
    `SELECT * FROM transactions 
     WHERE user_id = ? ${dateFilter}
     ORDER BY created_at DESC`,
    params,
    async (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: '获取交易数据失败' });
      }

      console.log(`[AI分析] 交易数量: ${transactions.length}`);

      // 检查API Key
      const apiKey = process.env.OPENAI_API_KEY;
      console.log(`[AI分析] API Key状态: ${apiKey ? `已设置（长度: ${apiKey.length}）` : '未设置'}`);

      if (!apiKey) {
        // 基础分析
        const basicAnalysis = generateBasicAnalysis(transactions);
        return res.json({ analysis: basicAnalysis });
      }

      try {
        // 重新加载环境变量以确保最新值
        dotenv.config({ path: join(__dirname_server, '.env') });
        const currentApiKey = process.env.OPENAI_API_KEY;

        if (!currentApiKey) {
          const basicAnalysis = generateBasicAnalysis(transactions);
          return res.json({ analysis: basicAnalysis });
        }

        const openai = new OpenAI({ apiKey: currentApiKey });

        // 计算统计数据
        const stats = calculateStats(transactions);
        const dailyStats = calculateDailyStats(transactions);
        const paymentMethodStats = calculatePaymentMethodStats(transactions);
        const categoryStats = calculateCategoryStats(transactions);

        // 构建详细的提示词
        let prompt = `你是一位专业的财务顾问，请基于以下用户的交易数据，提供详细、个性化、具体的财务分析和建议。

用户交易数据（${transactions.length}笔交易）：
${JSON.stringify(transactions.slice(0, 50), null, 2)}

统计信息：
- 总收入：${stats.income} GBP
- 总支出：${stats.expense} GBP
- 余额：${stats.balance} GBP
- 平均每日支出：${stats.avgDailyExpense} GBP

每日支出统计：
${JSON.stringify(dailyStats, null, 2)}

支付方式统计：
${JSON.stringify(paymentMethodStats, null, 2)}

分类统计：
${JSON.stringify(categoryStats, null, 2)}

请提供以下内容：

1. **逐笔分析重要交易**：
   - 仔细阅读每笔交易的描述，提取关键信息（地点、人物、活动、原因）
   - 例如：如果看到"Leeds餐厅"，说明用户去了Leeds，花费了多少钱
   - 如果看到"女朋友"、"朋友"等关键词，说明这是社交开销
   - 如果看到"路费"、"交通"等，说明这是出行开销

2. **个性化建议**：
   - 结合交易描述给出具体建议
   - 识别地点（如Leeds、York等城市）并给出当地化建议
   - 识别人际关系（如女朋友、朋友）并给出针对性建议
   - 提到具体金额和节省方案
   - 例如："你在Leeds花费了XX英镑吃饭，这个餐厅可能很好，但路费花了XX，以后可以尝试其他出行工具节省开支"
   - 例如："跟女朋友一起开销XX英镑，可以通过沟通实现两人各负责不同的开销，减轻自身压力"

3. **支出优化建议**：
   - 分析哪些支出可以优化
   - 提供具体的节省方案和金额

4. **时间分析**：
   - 分析每日、每周、每月的支出趋势
   - 指出支出高峰和低谷

**重要要求**：
- 必须详细、具体、个性化
- 必须提到具体的交易描述、地点、人物、金额
- 禁止使用模板化、官方的语言
- 必须像朋友一样给出建议，语气友好、亲切
- 必须结合交易描述中的具体信息
- 如果看到地点名称，必须提到并给出建议
- 如果看到人物关系，必须提到并给出建议

请用中文回复，提供详细的分析和建议。`;

        // 尝试使用GPT-4 Turbo，如果失败则降级
        let analysis = '';
        let modelUsed = '';

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: '你是一位专业、友好、细致的财务顾问，擅长从交易数据中提取关键信息，提供个性化、具体的财务建议。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 2000,
            temperature: 0.7
          });

          analysis = response.choices[0].message.content;
          modelUsed = 'gpt-4-turbo-preview';
          console.log(`[AI分析] ✅ 使用 ${modelUsed} 生成分析（长度: ${analysis.length}）`);
        } catch (error) {
          if (error.message.includes('gpt-4') || error.code === 'model_not_found') {
            console.log('GPT-4 Turbo不可用，尝试使用GPT-4...');
            try {
              const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                  {
                    role: 'system',
                    content: '你是一位专业、友好、细致的财务顾问，擅长从交易数据中提取关键信息，提供个性化、具体的财务建议。'
                  },
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 2000,
                temperature: 0.7
              });

              analysis = response.choices[0].message.content;
              modelUsed = 'gpt-4';
              console.log(`[AI分析] ✅ 使用 ${modelUsed} 生成分析（长度: ${analysis.length}）`);
            } catch (error2) {
              if (error2.message.includes('gpt-4') || error2.code === 'model_not_found') {
                console.log('GPT-4不可用，使用GPT-3.5 Turbo...');
                const response = await openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    {
                      role: 'system',
                      content: '你是一位专业、友好、细致的财务顾问，擅长从交易数据中提取关键信息，提供个性化、具体的财务建议。'
                    },
                    {
                      role: 'user',
                      content: prompt
                    }
                  ],
                  max_tokens: 2000,
                  temperature: 0.7
                });

                analysis = response.choices[0].message.content;
                modelUsed = 'gpt-3.5-turbo';
                console.log(`[AI分析] ✅ 使用 ${modelUsed} 生成分析（长度: ${analysis.length}）`);
              } else {
                throw error2;
              }
            }
          } else {
            throw error;
          }
        }

        if (!analysis || analysis.trim().length === 0) {
          console.log('[AI分析] ❌ AI分析为空，使用基础分析');
          const basicAnalysis = generateBasicAnalysis(transactions);
          return res.json({ analysis: basicAnalysis });
        }

        res.json({ analysis, model: modelUsed });

      } catch (error) {
        console.error('[AI分析] ❌ OpenAI API错误:', error);
        console.error('[AI分析] ❌ 错误类型:', error.constructor.name);
        console.error('[AI分析] ❌ 错误消息:', error.message);

        if (error.status === 429 || error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
          console.error('[AI分析] ❌ 错误代码:', error.code);
          const basicAnalysis = generateBasicAnalysis(transactions);
          return res.json({
            analysis: basicAnalysis,
            error: 'API配额不足，请检查您的OpenAI账户余额或配额设置。'
          });
        }

        const basicAnalysis = generateBasicAnalysis(transactions);
        res.json({
          analysis: basicAnalysis,
          error: 'AI分析暂时不可用，已提供基础分析。'
        });
      }
    }
  );
});

// 辅助函数：计算统计数据
function calculateStats(transactions) {
  const income = transactions
    .filter(t => t.transaction_type === '收入')
    .reduce((sum, t) => sum + t.amount_in_gbp, 0);
  const expense = transactions
    .filter(t => t.transaction_type === '支出')
    .reduce((sum, t) => sum + t.amount_in_gbp, 0);
  const balance = income - expense;

  const days = new Set(transactions.map(t => t.created_at.split('T')[0])).size;
  const avgDailyExpense = days > 0 ? expense / days : 0;

  return { income, expense, balance, avgDailyExpense };
}

// 辅助函数：计算每日统计
function calculateDailyStats(transactions) {
  const dailyMap = {};
  transactions.forEach(t => {
    const date = t.created_at.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { income: 0, expense: 0, count: 0 };
    }
    if (t.transaction_type === '收入') {
      dailyMap[date].income += t.amount_in_gbp;
    } else {
      dailyMap[date].expense += t.amount_in_gbp;
    }
    dailyMap[date].count++;
  });
  return dailyMap;
}

// 辅助函数：计算支付方式统计
function calculatePaymentMethodStats(transactions) {
  const stats = {};
  transactions.forEach(t => {
    if (!stats[t.payment_method]) {
      stats[t.payment_method] = { total: 0, count: 0 };
    }
    stats[t.payment_method].total += t.amount_in_gbp;
    stats[t.payment_method].count++;
  });
  return stats;
}

// 辅助函数：计算分类统计
function calculateCategoryStats(transactions) {
  const stats = {};
  transactions.forEach(t => {
    const category = t.category || '未分类';
    if (!stats[category]) {
      stats[category] = { total: 0, count: 0 };
    }
    stats[category].total += t.amount_in_gbp;
    stats[category].count++;
  });
  return stats;
}

// 辅助函数：生成基础分析
function generateBasicAnalysis(transactions) {
  const stats = calculateStats(transactions);
  return `📊 基础财务分析

💰 收入：${stats.income.toFixed(2)} GBP
💸 支出：${stats.expense.toFixed(2)} GBP
💵 余额：${stats.balance.toFixed(2)} GBP

📈 平均每日支出：${stats.avgDailyExpense.toFixed(2)} GBP

💡 提示：配置OpenAI API Key可以获得更详细、个性化的AI分析建议。`;
}

// ==================== 货币转换路由 ====================

app.post('/api/currency/convert', (req, res) => {
  const { amount, from, to } = req.body;

  if (!amount || !from || !to) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  // 简化的汇率（实际应该调用实时汇率API）
  const exchangeRates = {
    GBP: { GBP: 1, CNY: 9.09, USD: 1.27, EUR: 1.16 },
    CNY: { GBP: 0.11, CNY: 1, USD: 0.14, EUR: 0.13 },
    USD: { GBP: 0.79, CNY: 7.14, USD: 1, EUR: 0.91 },
    EUR: { GBP: 0.86, CNY: 7.83, USD: 1.10, EUR: 1 }
  };

  const rate = exchangeRates[from]?.[to];
  if (!rate) {
    return res.status(400).json({ error: '不支持的货币' });
  }

  const convertedAmount = amount * rate;
  res.json({
    amount,
    from,
    to,
    convertedAmount: convertedAmount.toFixed(2),
    rate
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// 性能监控API
app.get('/api/performance', authenticateToken, (req, res) => {
  const uptime = Math.floor((Date.now() - performanceStats.startTime) / 1000);
  const avgResponseTime = performanceStats.responseTimes.length > 0
    ? Math.round(performanceStats.responseTimes.reduce((a, b) => a + b, 0) / performanceStats.responseTimes.length)
    : 0;
  
  const sortedTimes = [...performanceStats.responseTimes].sort((a, b) => a - b);
  const p95 = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length * 0.95)]
    : 0;
  const p99 = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length * 0.99)]
    : 0;
  
  res.json({
    uptime: uptime,
    totalRequests: performanceStats.totalRequests,
    activeRequests: performanceStats.activeRequests,
    maxConcurrent: performanceStats.maxConcurrent,
    errors: performanceStats.errors,
    errorRate: performanceStats.totalRequests > 0
      ? ((performanceStats.errors / performanceStats.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    avgResponseTime: avgResponseTime + 'ms',
    p95ResponseTime: p95 + 'ms',
    p99ResponseTime: p99 + 'ms',
    database: {
      activeConnections: activeConnections,
      queueLength: queryQueue.length,
      maxConcurrentQueries: MAX_CONCURRENT_QUERIES
    },
    requestsPerSecond: uptime > 0
      ? (performanceStats.totalRequests / uptime).toFixed(2)
      : '0'
  });
});

// 启动服务器
// ==================== 管理员路由 ====================

// 获取所有用户（仅管理员）
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT 
      id, 
      username, 
      email, 
      role, 
      created_at,
      (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count
    FROM users 
    ORDER BY created_at DESC`,
    [],
    (err, users) => {
      if (err) {
        console.error('获取用户列表失败:', err);
        return res.status(500).json({ error: '获取用户列表失败' });
      }
      res.json(users);
    }
  );
});

// 获取用户统计信息（仅管理员）
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
      COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
      (SELECT COUNT(*) FROM transactions) as total_transactions
    FROM users`,
    [],
    (err, stats) => {
      if (err) {
        console.error('获取统计信息失败:', err);
        return res.status(500).json({ error: '获取统计信息失败' });
      }
      res.json(stats);
    }
  );
});

// 删除用户（仅管理员）
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }
  
  // 先删除用户的所有交易
  db.run('DELETE FROM transactions WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('删除用户交易失败:', err);
      return res.status(500).json({ error: '删除用户交易失败' });
    }
    
    // 然后删除用户
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('删除用户失败:', err);
        return res.status(500).json({ error: '删除用户失败' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      res.json({ message: '用户删除成功' });
    });
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 数据库路径: ${dbPath}`);
  console.log(`⚡ 性能优化已启用:`);
  console.log(`   - WAL模式: 支持并发读写`);
  console.log(`   - 最大并发查询: ${MAX_CONCURRENT_QUERIES}`);
  console.log(`   - 性能监控: /api/performance`);
  console.log(`   - 请求体限制: 10MB`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err);
      } else {
        console.log('数据库连接已关闭');
      }
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err);
      } else {
        console.log('数据库连接已关闭');
      }
      process.exit(0);
    });
  });
});
