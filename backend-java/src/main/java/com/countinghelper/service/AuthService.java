package com.countinghelper.service;

import com.countinghelper.dto.request.LoginRequest;
import com.countinghelper.dto.request.RegisterRequest;
import com.countinghelper.dto.response.AuthResponse;
import com.countinghelper.dto.response.UserResponse;
import com.countinghelper.entity.User;
import com.countinghelper.repository.TransactionRepository;
import com.countinghelper.repository.UserRepository;
import com.countinghelper.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * 使用 JdbcTemplate 插入用户，避免 SQLite JDBC 不支持 getGeneratedKeys() 导致注册失败。
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        String username = request.getUsername();
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        String email = request.getEmail() != null ? request.getEmail() : "";

        jdbcTemplate.update(
            "INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, 'user', datetime('now'))",
            username, encodedPassword, email);

        long newId = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);

        String token = tokenProvider.generateToken((int) newId, username);

        UserResponse userResponse = new UserResponse();
        userResponse.setId((int) newId);
        userResponse.setUsername(username);
        userResponse.setEmail(email);
        userResponse.setRole("user");
        userResponse.setCreatedAt(LocalDateTime.now());

        return new AuthResponse("注册成功", token, userResponse);
    }
    
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("用户名或密码错误"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        
        String role = (user.getRole() != null && !user.getRole().isEmpty() && !user.getRole().equals("null")) 
            ? user.getRole() : "user";
        
        String token = tokenProvider.generateToken(user.getId(), user.getUsername());
        
        UserResponse userResponse = new UserResponse();
        userResponse.setId(user.getId());
        userResponse.setUsername(user.getUsername());
        userResponse.setEmail(user.getEmail());
        userResponse.setRole(role);
        userResponse.setCreatedAt(user.getCreatedAt());
        
        return new AuthResponse("登录成功", token, userResponse);
    }
    
    public UserResponse getCurrentUser(Integer userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        String role = (user.getRole() != null && !user.getRole().isEmpty() && !user.getRole().equals("null")) 
            ? user.getRole() : "user";
        
        long transactionCount = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId).size();
        
        UserResponse userResponse = new UserResponse();
        userResponse.setId(user.getId());
        userResponse.setUsername(user.getUsername());
        userResponse.setEmail(user.getEmail());
        userResponse.setRole(role);
        userResponse.setCreatedAt(user.getCreatedAt());
        userResponse.setTransactionCount((int) transactionCount);
        
        return userResponse;
    }
}
