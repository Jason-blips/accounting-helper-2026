package com.countinghelper.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionRequest {
    @NotNull(message = "金额不能为空")
    @JsonAlias("amount")
    private Double amount;

    @NotBlank(message = "货币不能为空")
    private String currency;

    private String description;
    private String category;

    @NotBlank(message = "支付方式不能为空")
    @JsonAlias("payment_method")
    private String paymentMethod;

    @NotBlank(message = "交易类型不能为空")
    @JsonAlias("transaction_type")
    private String transactionType;

    @JsonAlias("created_at")
    private String createdAt;

    public TransactionRequest() {
    }

    public Double getAmount() {
        return amount;
    }

    /** 接受 number 或 string，便于前端兼容 */
    public void setAmount(Object value) {
        if (value == null) {
            this.amount = null;
            return;
        }
        if (value instanceof Number) {
            this.amount = ((Number) value).doubleValue();
            return;
        }
        try {
            this.amount = Double.parseDouble(value.toString().trim());
        } catch (NumberFormatException e) {
            this.amount = null;
        }
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
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
    
    public String getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
