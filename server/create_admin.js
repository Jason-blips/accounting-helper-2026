const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { join } = require('path');

const dbPath = join(__dirname, '..', 'database', 'accounting.db');
const adminUsername = 'manager';
const adminPassword = 'SecurPass2026!';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 数据库连接成功');
  createOrUpdateAdmin();
});

function createOrUpdateAdmin() {
  // 先确保role列存在
  db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\'', (alterErr) => {
    // 忽略错误（如果列已存在）
    if (alterErr && !alterErr.message.includes('duplicate column')) {
      console.log('⚠️  添加role列:', alterErr.message);
    }
  });
  
  // 等待一下确保列已添加
  setTimeout(() => {
    checkAndCreateAdmin();
  }, 100);
}

function checkAndCreateAdmin() {
  // 先检查账户是否存在
  db.get('SELECT id, password, role FROM users WHERE username = ?', [adminUsername], async (err, user) => {
    if (err) {
      console.error('❌ 查询用户失败:', err);
      db.close();
      return;
    }
    
    if (user) {
      console.log('📋 管理员账户已存在，正在重置密码和角色...');
      
      // 加密新密码
      const hash = await bcrypt.hash(adminPassword, 10);
      
      // 更新密码和角色
      db.run(
        'UPDATE users SET password = ?, role = ? WHERE username = ?',
        [hash, 'admin', adminUsername],
        function(updateErr) {
          if (updateErr) {
            console.error('❌ 更新管理员账户失败:', updateErr);
          } else {
            console.log('✅ 管理员账户已更新');
            console.log(`   用户名: ${adminUsername}`);
            console.log(`   密码: ${adminPassword}`);
            console.log(`   角色: admin`);
          }
          db.close();
        }
      );
    } else {
      console.log('📝 正在创建管理员账户...');
      
      // 加密密码
      const hash = await bcrypt.hash(adminPassword, 10);
      
      // 创建管理员账户
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [adminUsername, hash, 'admin'],
        function(insertErr) {
          if (insertErr) {
            console.error('❌ 创建管理员账户失败:', insertErr);
          } else {
            console.log('✅ 管理员账户创建成功');
            console.log(`   用户名: ${adminUsername}`);
            console.log(`   密码: ${adminPassword}`);
            console.log(`   角色: admin`);
            console.log(`   ID: ${this.lastID}`);
          }
          db.close();
        }
      );
    }
  });
}
