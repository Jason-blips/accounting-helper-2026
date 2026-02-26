package com.countinghelper.controller;

import com.countinghelper.dto.request.TransactionRequest;
import com.countinghelper.dto.response.StatsResponse;
import com.countinghelper.entity.Transaction;
import com.countinghelper.service.TransactionService;
import org.springframework.data.domain.Page;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    
    @Autowired
    private TransactionService transactionService;
    
    private Integer getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new org.springframework.security.access.AccessDeniedException("未认证");
        }
        return (Integer) authentication.getPrincipal();
    }
    
    @PostMapping
    public ResponseEntity<?> createTransaction(
            Authentication authentication,
            @Valid @RequestBody TransactionRequest request) {
        try {
            Integer userId = getUserId(authentication);
            Transaction transaction = transactionService.createTransaction(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", transaction.getId(), "message", "交易创建成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getTransactions(
            Authentication authentication,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            Integer userId = getUserId(authentication);
            List<Transaction> transactions;
            if (from != null && !from.isEmpty() && to != null && !to.isEmpty()) {
                transactions = transactionService.getTransactionsInRange(userId, from, to);
            } else {
                transactions = transactionService.getTransactions(userId, date);
            }
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取交易失败"));
        }
    }

    @GetMapping("/paged")
    public ResponseEntity<?> getTransactionsPaged(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            Integer userId = getUserId(authentication);
            Page<Transaction> result = transactionService.getTransactionsPaged(userId, page, size, date, from, to);
            Map<String, Object> body = new HashMap<>();
            body.put("content", result.getContent());
            body.put("totalElements", result.getTotalElements());
            body.put("totalPages", result.getTotalPages());
            body.put("number", result.getNumber());
            body.put("size", result.getSize());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取交易失败"));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(
            Authentication authentication,
            @PathVariable Integer id,
            @Valid @RequestBody TransactionRequest request) {
        try {
            Integer userId = getUserId(authentication);
            transactionService.updateTransaction(userId, id, request);
            return ResponseEntity.ok(Map.of("message", "交易更新成功"));
        } catch (RuntimeException e) {
            if (e.getMessage().equals("交易不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "更新交易失败"));
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(
            Authentication authentication,
            @PathVariable Integer id) {
        try {
            Integer userId = getUserId(authentication);
            transactionService.deleteTransaction(userId, id);
            return ResponseEntity.ok(Map.of("message", "交易删除成功"));
        } catch (RuntimeException e) {
            if (e.getMessage().equals("交易不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "删除交易失败"));
        }
    }
    
    @GetMapping("/stats/summary")
    public ResponseEntity<?> getStats(Authentication authentication) {
        try {
            Integer userId = getUserId(authentication);
            StatsResponse stats = transactionService.getStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取统计失败"));
        }
    }
}
