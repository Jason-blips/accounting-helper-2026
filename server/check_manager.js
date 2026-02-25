const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { join } = require('path');

const dbPath = join(__dirname, '..', 'database', 'accounting.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 数据库连接成功\n');
  checkManager();
});

function checkManager() {
  console.log('📋 检查manager账户状态...\n');
  
  db.get('SELECT * FROM users WHERE username = ?', ['manager'], (err, user) => {
    if (err) {
      console.error('❌ 查询失败:', err);
      db.close();
      return;
    }
    
    if (!user) {
      console.log('❌ manager账户不存在！');
      db.close();
      return;
    }
    
    console.log('✅ manager账户信息:');
    console.log(`   ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role || '未设置'}`);
    console.log(`   邮箱: ${user.email || '未设置'}`);
    console.log(`   创建时间: ${user.created_at || '未知'}`);
    
    if (user.role === 'admin') {
      console.log('\n✅ manager账户已正确设置为管理员！');
    } else {
      console.log('\n⚠️  manager账户角色不是admin，需要修复！');
      console.log('   当前角色:', user.role || 'null');
    }
    
    // 检查所有用户
    console.log('\n📊 所有用户列表:');
    db.all('SELECT id, username, role FROM users ORDER BY id', [], (err, users) => {
      if (err) {
        console.error('❌ 查询用户列表失败:', err);
      } else {
        users.forEach(u => {
          const roleBadge = u.role === 'admin' ? '👑 管理员' : '👤 普通用户';
          console.log(`   ${u.id}. ${u.username} - ${roleBadge} (${u.role || 'null'})`);
        });
      }
      db.close();
    });
  });
}
