const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { join } = require('path');

const dbPath = join(__dirname, '..', 'database', 'accounting.db');
const adminUsername = 'manager';
const testPassword = 'SecurPass2026!';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 数据库连接成功');
  testLogin();
});

function testLogin() {
  db.get('SELECT * FROM users WHERE username = ?', [adminUsername], async (err, user) => {
    if (err) {
      console.error('❌ 查询用户失败:', err);
      db.close();
      return;
    }
    
    if (!user) {
      console.log('❌ 管理员账户不存在！');
      db.close();
      return;
    }
    
    console.log('📋 找到管理员账户:');
    console.log(`   ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role || '未设置'}`);
    console.log(`   邮箱: ${user.email || '未设置'}`);
    
    // 测试密码
    const validPassword = await bcrypt.compare(testPassword, user.password);
    
    if (validPassword) {
      console.log('✅ 密码验证成功！');
      console.log('\n📝 登录信息:');
      console.log(`   用户名: ${adminUsername}`);
      console.log(`   密码: ${testPassword}`);
    } else {
      console.log('❌ 密码验证失败！');
      console.log('   当前密码不匹配，需要重置密码');
    }
    
    db.close();
  });
}
