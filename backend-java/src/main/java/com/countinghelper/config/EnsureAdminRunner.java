package com.countinghelper.config;

import com.countinghelper.entity.User;
import com.countinghelper.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 启动时若没有任何用户，则创建默认管理员 admin / admin123。
 * 用于 Render 等首次部署（DDL_AUTO=update 建表后库为空）或全新环境。
 */
@Component
@Order(2)
public class EnsureAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(EnsureAdminRunner.class);
    private static final String ADMIN_USER = "admin";
    private static final String ADMIN_PASS = "admin123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public EnsureAdminRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        if (userRepository.existsByUsername(ADMIN_USER)) {
            return;
        }
        User admin = new User();
        admin.setUsername(ADMIN_USER);
        admin.setPassword(passwordEncoder.encode(ADMIN_PASS));
        admin.setEmail("");
        admin.setRole("admin");
        admin.setCreatedAt(LocalDateTime.now());
        userRepository.save(admin);
        log.info("[Init] No users found. Created default admin (username: {}, password: {}). Change in production.", ADMIN_USER, ADMIN_PASS);
    }
}
