package com.countinghelper.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.io.File;

/**
 * 使用 db.path 构建 SQLite 连接，路径统一转为「正斜杠」避免 Windows 下空格路径问题。
 */
@Configuration
public class SqliteDataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource(@Value("${db.path}") String dbPath) {
        File file = new File(dbPath);
        String absolute = file.getAbsolutePath().replace("\\", "/");
        String url = "jdbc:sqlite:" + absolute;
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setDriverClassName("org.sqlite.JDBC");
        ds.setMaximumPoolSize(1);
        return ds;
    }
}
