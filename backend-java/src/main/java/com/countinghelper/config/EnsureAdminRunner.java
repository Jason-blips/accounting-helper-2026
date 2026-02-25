package com.countinghelper.config;

import com.countinghelper.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 启动时若没有任何用户且启用了初始化，则创建默认管理员。
 * 用户名与密码见 application.yml 的 app.init.admin，可通过环境变量覆盖。
 * 使用 JdbcTemplate 插入，避免 SQLite JDBC 不支持 getGeneratedKeys() 导致启动失败。
 */
@Component
@Order(2)
public class EnsureAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(EnsureAdminRunner.class);

    @Value("${app.init.admin.enabled:false}")
    private boolean enabled;

    @Value("${app.init.admin.username:admin}")
    private String initAdminUsername;

    @Value("${app.init.admin.password:admin123}")
    private String initAdminPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public EnsureAdminRunner(UserRepository userRepository, PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        if (userRepository.count() > 0) {
            return;
        }
        if (initAdminUsername == null || initAdminUsername.isBlank() || initAdminPassword == null || initAdminPassword.isBlank()) {
            log.warn("[Init] Skipped creating default admin: username or password not set.");
            return;
        }
        if (userRepository.existsByUsername(initAdminUsername)) {
            return;
        }
        String hash = passwordEncoder.encode(initAdminPassword);
        jdbcTemplate.update(
            "INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, '', 'admin', datetime('now'))",
            initAdminUsername, hash);
        log.info("[Init] No users found. Created default admin (username: {}). Change password after first login.", initAdminUsername);
    }
}
