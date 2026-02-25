package com.countinghelper.dto.response;

public class StatsResponse {
    private String income;
    private String expense;
    private String balance;
    private Integer incomeCount;
    private Integer expenseCount;
    
    public StatsResponse() {
    }
    
    public StatsResponse(String income, String expense, String balance, Integer incomeCount, Integer expenseCount) {
        this.income = income;
        this.expense = expense;
        this.balance = balance;
        this.incomeCount = incomeCount;
        this.expenseCount = expenseCount;
    }
    
    public String getIncome() {
        return income;
    }
    
    public void setIncome(String income) {
        this.income = income;
    }
    
    public String getExpense() {
        return expense;
    }
    
    public void setExpense(String expense) {
        this.expense = expense;
    }
    
    public String getBalance() {
        return balance;
    }
    
    public void setBalance(String balance) {
        this.balance = balance;
    }
    
    public Integer getIncomeCount() {
        return incomeCount;
    }
    
    public void setIncomeCount(Integer incomeCount) {
        this.incomeCount = incomeCount;
    }
    
    public Integer getExpenseCount() {
        return expenseCount;
    }
    
    public void setExpenseCount(Integer expenseCount) {
        this.expenseCount = expenseCount;
    }
}
