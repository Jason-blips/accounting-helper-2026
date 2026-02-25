package com.countinghelper.controller;

import com.countinghelper.entity.Transaction;
import com.countinghelper.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 调试用：检查当前用户可见的交易数量及一条示例的 created_at，用于排查「有总收支但列表为空」。
 */
@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Autowired
    private TransactionRepository transactionRepository;

    private static Integer getUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() != null) {
            return (Integer) auth.getPrincipal();
        }
        return 1;
    }

    @GetMapping("/transaction-info")
    public ResponseEntity<Map<String, Object>> transactionInfo(Authentication authentication) {
        Integer userId = getUserId(authentication);
        List<Transaction> list = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<String, Object> body = new HashMap<>();
        body.put("userId", userId);
        body.put("transactionCount", list.size());
        if (!list.isEmpty()) {
            Transaction first = list.get(0);
            body.put("sampleId", first.getId());
            body.put("sampleCreatedAt", first.getCreatedAt() != null ? first.getCreatedAt().toString() : null);
        }
        return ResponseEntity.ok(body);
    }
}
