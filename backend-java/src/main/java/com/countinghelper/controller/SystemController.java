package com.countinghelper.controller;

import com.countinghelper.entity.Transaction;
import com.countinghelper.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SystemController {

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        return ResponseEntity.ok(response);
    }

    /** 调试：查看 user_id=1 的交易笔数及一条示例，用于排查「有总收支但列表为空」 */
    @GetMapping("/transaction-info")
    public ResponseEntity<Map<String, Object>> transactionInfo() {
        int userId = 1;
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
