package com.countinghelper.service;

import com.countinghelper.dto.request.TransactionRequest;
import com.countinghelper.dto.response.StatsResponse;
import com.countinghelper.entity.Transaction;
import com.countinghelper.repository.TransactionRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TransactionService {

    private static final DateTimeFormatter DB_DATETIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    private static final Map<String, Double> EXCHANGE_RATES = new HashMap<>();
    
    static {
        EXCHANGE_RATES.put("GBP", 1.0);
        EXCHANGE_RATES.put("CNY", 0.11);
        EXCHANGE_RATES.put("USD", 0.79);
        EXCHANGE_RATES.put("EUR", 0.86);
    }
    
    /**
     * 使用 JdbcTemplate 执行 INSERT 并通过 last_insert_rowid() 取回 ID，
     * 避免 SQLite JDBC 不支持 getGeneratedKeys() 导致的 400。
     */
    @Transactional
    public Transaction createTransaction(Integer userId, TransactionRequest request) {
        double amount = request.getAmount();
        String currency = request.getCurrency();
        double amountInGbp = amount * EXCHANGE_RATES.getOrDefault(currency, 1.0);
        LocalDateTime createdAt;
        if (request.getCreatedAt() != null && !request.getCreatedAt().isEmpty()) {
            try {
                String dateStr = request.getCreatedAt();
                if (!dateStr.contains("T")) {
                    dateStr = dateStr + "T12:00:00";
                }
                createdAt = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception e) {
                createdAt = LocalDateTime.now();
            }
        } else {
            createdAt = LocalDateTime.now();
        }
        String createdAtStr = createdAt.format(DB_DATETIME);

        String sql = "INSERT INTO transactions (user_id, amount, amount_in_gbp, currency, description, category, payment_method, transaction_type, created_at) VALUES (?,?,?,?,?,?,?,?,?)";
        jdbcTemplate.update(sql,
            userId,
            amount,
            amountInGbp,
            currency,
            request.getDescription() != null ? request.getDescription() : "",
            request.getCategory() != null ? request.getCategory() : "",
            request.getPaymentMethod(),
            request.getTransactionType(),
            createdAtStr);

        long id = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);
        Transaction transaction = new Transaction();
        transaction.setId((int) id);
        transaction.setUserId(userId);
        transaction.setAmount(amount);
        transaction.setCurrency(currency);
        transaction.setAmountInGbp(amountInGbp);
        transaction.setDescription(request.getDescription());
        transaction.setCategory(request.getCategory());
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setTransactionType(request.getTransactionType());
        transaction.setCreatedAt(createdAt);
        return transaction;
    }
    
    /** 按 id 获取单条交易（仅限当前用户） */
    public Transaction getTransactionById(Integer userId, Integer transactionId) {
        return transactionRepository.findByIdAndUserId(transactionId, userId)
            .orElseThrow(() -> new RuntimeException("交易不存在"));
    }

    public List<Transaction> getTransactions(Integer userId, String date) {
        if (date != null && !date.isEmpty()) {
            try {
                // 验证日期格式
                LocalDateTime.parse(date + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                return transactionRepository.findByUserIdAndDate(userId, date);
            } catch (Exception e) {
                return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
            }
        }
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** 按日期范围查询（含 from 和 to 当天，用于一周/一月分享） */
    public List<Transaction> getTransactionsInRange(Integer userId, String from, String to) {
        try {
            LocalDateTime start = LocalDateTime.parse(from + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            LocalDateTime end = LocalDateTime.parse(to + "T23:59:59", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            return transactionRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 分页查询：支持 date/from/to、type、paymentMethod、category、keyword 筛选 */
    public Page<Transaction> getTransactionsPaged(
            Integer userId, int page, int size,
            String date, String from, String to,
            String transactionType, String paymentMethod, String category, String keyword) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Transaction> spec = buildListSpec(userId, date, from, to, transactionType, paymentMethod, category, keyword);
        return transactionRepository.findAll(spec, pageable);
    }

    private Specification<Transaction> buildListSpec(
            Integer userId, String date, String from, String to,
            String transactionType, String paymentMethod, String category, String keyword) {
        return (Root<Transaction> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("userId"), userId));

            if (from != null && !from.isEmpty() && to != null && !to.isEmpty()) {
                try {
                    LocalDateTime start = LocalDateTime.parse(from + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    LocalDateTime end = LocalDateTime.parse(to + "T23:59:59", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    preds.add(cb.between(root.get("createdAt"), start, end));
                } catch (Exception ignored) { }
            } else if (date != null && !date.isEmpty()) {
                try {
                    LocalDateTime start = LocalDateTime.parse(date + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    LocalDateTime end = LocalDateTime.parse(date + "T23:59:59", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    preds.add(cb.between(root.get("createdAt"), start, end));
                } catch (Exception ignored) { }
            }

            if (transactionType != null && !transactionType.isEmpty()) {
                preds.add(cb.equal(root.get("transactionType"), transactionType));
            }
            if (paymentMethod != null && !paymentMethod.isEmpty()) {
                preds.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (category != null && !category.isEmpty()) {
                preds.add(cb.equal(root.get("category"), category));
            }
            if (keyword != null && !keyword.isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                preds.add(cb.or(
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("category"), "")), pattern)
                ));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
    
    @Transactional
    public Transaction updateTransaction(Integer userId, Integer transactionId, TransactionRequest request) {
        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new RuntimeException("交易不存在"));
        
        if (!transaction.getUserId().equals(userId)) {
            throw new RuntimeException("交易不存在");
        }
        
        transaction.setAmount(request.getAmount());
        transaction.setCurrency(request.getCurrency());
        transaction.setAmountInGbp(request.getAmount() * EXCHANGE_RATES.getOrDefault(request.getCurrency(), 1.0));
        transaction.setDescription(request.getDescription());
        transaction.setCategory(request.getCategory());
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setTransactionType(request.getTransactionType());
        
        if (request.getCreatedAt() != null && !request.getCreatedAt().isEmpty()) {
            try {
                String dateStr = request.getCreatedAt();
                if (!dateStr.contains("T")) {
                    dateStr = dateStr + "T12:00:00";
                }
                transaction.setCreatedAt(LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            } catch (Exception e) {
                // 保持原日期
            }
        }
        
        return transactionRepository.save(transaction);
    }
    
    @Transactional
    public void deleteTransaction(Integer userId, Integer transactionId) {
        if (!transactionRepository.existsByIdAndUserId(transactionId, userId)) {
            throw new RuntimeException("交易不存在");
        }
        transactionRepository.deleteByIdAndUserId(transactionId, userId);
    }
    
    public StatsResponse getStats(Integer userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        double income = 0.0;
        double expense = 0.0;
        int incomeCount = 0;
        int expenseCount = 0;
        
        for (Transaction t : transactions) {
            if ("收入".equals(t.getTransactionType())) {
                income += t.getAmountInGbp();
                incomeCount++;
            } else {
                expense += t.getAmountInGbp();
                expenseCount++;
            }
        }
        
        double balance = income - expense;
        
        return new StatsResponse(
            String.format("%.2f", income),
            String.format("%.2f", expense),
            String.format("%.2f", balance),
            incomeCount,
            expenseCount
        );
    }
}
