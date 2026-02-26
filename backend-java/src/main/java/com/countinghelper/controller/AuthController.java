package com.countinghelper.controller;

import com.countinghelper.dto.request.LoginRequest;
import com.countinghelper.dto.request.RegisterRequest;
import com.countinghelper.dto.response.AuthResponse;
import com.countinghelper.dto.response.UserResponse;
import com.countinghelper.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            // 仅返回对用户友好的文案，不暴露数据库等原始报错
            String msg = "用户名已存在".equals(e.getMessage()) ? e.getMessage() : "注册失败";
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // 仅返回对用户友好的文案；用 400 避免浏览器把登录失败当成 401 未认证
            String msg = "用户名或密码错误".equals(e.getMessage()) ? e.getMessage() : "登录失败";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", msg));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "TOKEN_MISSING"));
        }
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            UserResponse user = authService.getCurrentUser(userId);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        }
    }
}
