package com.countinghelper.controller;

import com.countinghelper.dto.response.UserResponse;
import com.countinghelper.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    
    @Autowired
    private AdminService adminService;
    
    private Integer getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new org.springframework.security.access.AccessDeniedException("未认证");
        }
        return (Integer) authentication.getPrincipal();
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        try {
            Integer userId = getUserId(authentication);
            if (!adminService.isAdmin(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "需要管理员权限"));
            }
            List<UserResponse> users = adminService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取用户列表失败"));
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Authentication authentication) {
        try {
            Integer userId = getUserId(authentication);
            if (!adminService.isAdmin(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "需要管理员权限"));
            }
            Map<String, Object> stats = adminService.getStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取统计信息失败"));
        }
    }
    
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            Authentication authentication,
            @PathVariable Integer id) {
        try {
            Integer adminId = getUserId(authentication);
            if (!adminService.isAdmin(adminId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "需要管理员权限"));
            }
            adminService.deleteUser(adminId, id);
            return ResponseEntity.ok(Map.of("message", "用户删除成功"));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if ("不能删除自己的账户".equals(msg)) {
                return ResponseEntity.badRequest().body(Map.of("error", msg));
            }
            if ("用户不存在".equals(msg)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "删除用户失败"));
        }
    }
}
