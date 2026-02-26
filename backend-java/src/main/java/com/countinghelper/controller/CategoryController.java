package com.countinghelper.controller;

import com.countinghelper.entity.UserCategory;
import com.countinghelper.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    private Integer getUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new org.springframework.security.access.AccessDeniedException("未认证");
        }
        return (Integer) auth.getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<UserCategory>> list(Authentication authentication) {
        Integer userId = getUserId(authentication);
        return ResponseEntity.ok(categoryService.listByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication, @RequestBody Map<String, String> body) {
        String name = body != null ? body.get("name") : null;
        try {
            Integer userId = getUserId(authentication);
            UserCategory created = categoryService.create(userId, name);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            Authentication authentication,
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String name = body != null ? body.get("name") : null;
        try {
            Integer userId = getUserId(authentication);
            UserCategory updated = categoryService.update(userId, id, name);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("分类不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(Authentication authentication, @PathVariable Integer id) {
        try {
            Integer userId = getUserId(authentication);
            categoryService.delete(userId, id);
            return ResponseEntity.ok(Map.of("message", "已删除"));
        } catch (RuntimeException e) {
            if (e.getMessage().equals("分类不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
