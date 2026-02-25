package com.countinghelper.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.File;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * 独立运行：检查数据库中是否有 admin/admin123，没有则创建或更新。
 * 用法：在 backend-java 目录执行
 *   mvn compile exec:java -Dexec.mainClass="com.countinghelper.tools.EnsureAdminUser"
 * 或指定数据库路径：
 *   mvn compile exec:java -Dexec.mainClass="com.countinghelper.tools.EnsureAdminUser" -Dexec.args="C:/path/to/accounting.db"
 */
public class EnsureAdminUser {

    private static final String ADMIN_USER = "admin";
    private static final String ADMIN_PASS = "admin123";

    public static void main(String[] args) throws Exception {
        String dbPath = args.length > 0 ? args[0] : Paths.get(System.getProperty("user.dir"), "..", "database", "accounting.db").toAbsolutePath().normalize().toString();
        File f = new File(dbPath);
        if (!f.exists()) {
            System.err.println("Database file not found: " + dbPath);
            System.err.println("Usage: EnsureAdminUser [path/to/accounting.db]");
            System.exit(1);
        }
        String url = "jdbc:sqlite:" + f.getAbsolutePath().replace("\\", "/");
        System.out.println("Using database: " + url);

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashForAdmin123 = encoder.encode(ADMIN_PASS);

        try (Connection conn = DriverManager.getConnection(url)) {
            // 检查 users 表是否存在
            try (Statement st = conn.createStatement()) {
                st.executeQuery("SELECT 1 FROM users LIMIT 1").close();
            } catch (Exception e) {
                System.err.println("Table 'users' missing or not readable. Error: " + e.getMessage());
                System.exit(2);
            }

            Integer adminId = null;
            String existingHash = null;
            String sqlSelect = "SELECT id, password FROM users WHERE username = ?";
            try (PreparedStatement ps = conn.prepareStatement(sqlSelect)) {
                ps.setString(1, ADMIN_USER);
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    adminId = rs.getInt("id");
                    existingHash = rs.getString("password");
                }
                rs.close();
            }

            if (existingHash != null && encoder.matches(ADMIN_PASS, existingHash)) {
                System.out.println("OK: User 'admin' already exists and password is admin123. No change.");
                return;
            }

            if (adminId != null) {
                String sqlUpdate = "UPDATE users SET password = ?, role = ? WHERE username = ?";
                try (PreparedStatement ps = conn.prepareStatement(sqlUpdate)) {
                    ps.setString(1, hashForAdmin123);
                    ps.setString(2, "admin");
                    ps.setString(3, ADMIN_USER);
                    int updated = ps.executeUpdate();
                    System.out.println("OK: Updated user 'admin' password to admin123 (role=admin). Rows updated: " + updated);
                }
            } else {
                String sqlInsert = "INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, '', 'admin', datetime('now'))";
                try (PreparedStatement ps = conn.prepareStatement(sqlInsert)) {
                    ps.setString(1, ADMIN_USER);
                    ps.setString(2, hashForAdmin123);
                    ps.executeUpdate();
                    System.out.println("OK: Created user 'admin' with password admin123 (role=admin).");
                }
            }
        }
    }
}
