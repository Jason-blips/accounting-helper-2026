package com.countinghelper.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CurrencyConvertRequest {
    @NotNull(message = "金额不能为空")
    private Double amount;
    
    @NotBlank(message = "源货币不能为空")
    private String from;
    
    @NotBlank(message = "目标货币不能为空")
    private String to;
    
    public CurrencyConvertRequest() {
    }
    
    public Double getAmount() {
        return amount;
    }
    
    public void setAmount(Double amount) {
        this.amount = amount;
    }
    
    public String getFrom() {
        return from;
    }
    
    public void setFrom(String from) {
        this.from = from;
    }
    
    public String getTo() {
        return to;
    }
    
    public void setTo(String to) {
        this.to = to;
    }
}
