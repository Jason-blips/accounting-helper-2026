package com.countinghelper.entity;

import com.countinghelper.config.LocalDateTimeSqliteConverter;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "user_id", nullable = false)
    private Integer userId;
    
    @Column(nullable = false)
    private Double amount;
    
    @Column(nullable = false, length = 10)
    private String currency;
    
    @Column(name = "amount_in_gbp", nullable = false)
    private Double amountInGbp;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String category;
    
    @Column(name = "payment_method", nullable = false, length = 50)
    private String paymentMethod;
    
    @Column(name = "transaction_type", nullable = false, length = 20)
    private String transactionType;
    
    @Convert(converter = LocalDateTimeSqliteConverter.class)
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    public Transaction() {
    }
    
    public Transaction(Integer id, Integer userId, Double amount, String currency, Double amountInGbp, 
                       String description, String category, String paymentMethod, String transactionType, 
                       LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.amount = amount;
        this.currency = currency;
        this.amountInGbp = amountInGbp;
        this.description = description;
        this.category = category;
        this.paymentMethod = paymentMethod;
        this.transactionType = transactionType;
        this.createdAt = createdAt;
    }
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
    // Getters and Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public Integer getUserId() {
        return userId;
    }
    
    public void setUserId(Integer userId) {
        this.userId = userId;
    }
    
    public Double getAmount() {
        return amount;
    }
    
    public void setAmount(Double amount) {
        this.amount = amount;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public Double getAmountInGbp() {
        return amountInGbp;
    }
    
    public void setAmountInGbp(Double amountInGbp) {
        this.amountInGbp = amountInGbp;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public String getPaymentMethod() {
        return paymentMethod;
    }
    
    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
    
    public String getTransactionType() {
        return transactionType;
    }
    
    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
