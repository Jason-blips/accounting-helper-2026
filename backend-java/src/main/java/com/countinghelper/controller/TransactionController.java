package com.countinghelper.controller;

import com.countinghelper.dto.request.TransactionRequest;
import com.countinghelper.dto.response.StatsResponse;
import com.countinghelper.entity.Transaction;
import com.countinghelper.service.TransactionExportService;
import com.countinghelper.service.TransactionImportService;
import com.countinghelper.service.TransactionService;
import org.springframework.data.domain.Page;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    
    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionExportService transactionExportService;

    @Autowired
    private TransactionImportService transactionImportService;
    
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
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {
        try {
            Integer userId = getUserId(authentication);
            Page<Transaction> result = transactionService.getTransactionsPaged(
                userId, page, size, date, from, to, type, paymentMethod, category, keyword);
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

    @GetMapping("/{id}")
    public ResponseEntity<?> getTransaction(
            Authentication authentication,
            @PathVariable Integer id) {
        try {
            Integer userId = getUserId(authentication);
            Transaction transaction = transactionService.getTransactionById(userId, id);
            return ResponseEntity.ok(transaction);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("交易不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            }
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
    
    /** 导入交易：上传 CSV 文件，格式与导出一致（日期,类型,金额,货币,支付方式,分类,描述） */
    @PostMapping("/import")
    public ResponseEntity<?> importTransactions(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "请选择 CSV 文件"));
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".csv")) {
            return ResponseEntity.badRequest().body(Map.of("error", "仅支持 .csv 文件"));
        }
        try {
            Integer userId = getUserId(authentication);
            byte[] bytes = file.getBytes();
            TransactionImportService.ImportResult result = transactionImportService.importCsvForUser(userId, bytes);
            Map<String, Object> body = new HashMap<>();
            body.put("imported", result.imported);
            body.put("failed", result.failed);
            body.put("errors", result.errors);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "导入失败：" + e.getMessage()));
        }
    }

    /** 导出交易：format=csv|excel，from/to 可选日期范围（YYYY-MM-DD），不传则导出全部 */
    @GetMapping("/export")
    public ResponseEntity<?> exportTransactions(
            Authentication authentication,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            Integer userId = getUserId(authentication);
            List<Transaction> list;
            if (from != null && !from.isEmpty() && to != null && !to.isEmpty()) {
                list = transactionService.getTransactionsInRange(userId, from, to);
            } else {
                list = transactionService.getTransactions(userId, null);
            }
            byte[] bytes;
            String filename;
            String contentType;
            if ("excel".equalsIgnoreCase(format)) {
                bytes = transactionExportService.exportToExcel(list);
                filename = "transactions.xlsx";
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else {
                bytes = transactionExportService.exportToCsv(list);
                filename = "transactions.csv";
                contentType = "text/csv; charset=UTF-8";
            }
            String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "导出失败：" + e.getMessage()));
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
