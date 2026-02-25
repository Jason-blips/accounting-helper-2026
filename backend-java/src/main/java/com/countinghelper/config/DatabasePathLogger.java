package com.countinghelper.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.File;

/**
 * 启动时打印实际使用的数据库路径，并检查文件是否存在，便于排查「数据库未加载」问题。
 */
@Component
@Order(1)
public class DatabasePathLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabasePathLogger.class);

    @Value("${db.path:}")
    private String dbPath;

    @Override
    public void run(ApplicationArguments args) {
        if (dbPath == null || dbPath.isEmpty()) {
            log.warn("[DB] db.path is not set, check application.yml");
            return;
        }
        log.info("[DB] Resolved path: {}", dbPath);
        File file = new File(dbPath);
        if (file.exists()) {
            log.info("[DB] File exists: yes, size: {} bytes", file.length());
        } else {
            log.warn("[DB] File exists: NO. Put accounting.db in project folder: .../database/accounting.db");
            log.warn("[DB] Or set env DB_PATH to your backup file (absolute path), then restart.");
        }
    }
}
