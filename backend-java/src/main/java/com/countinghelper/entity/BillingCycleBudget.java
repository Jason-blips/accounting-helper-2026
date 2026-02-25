package com.countinghelper.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "billing_cycle_budget", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "cycle_start"}))
public class BillingCycleBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    /** Cycle start date (YYYY-MM-DD), e.g. 2025-02-15 */
    @Column(name = "cycle_start", nullable = false, length = 10)
    private String cycleStart;

    @Column(name = "expected_income")
    private Double expectedIncome;

    @Column(name = "expected_expense")
    private Double expectedExpense;

    public BillingCycleBudget() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getCycleStart() { return cycleStart; }
    public void setCycleStart(String cycleStart) { this.cycleStart = cycleStart; }
    public Double getExpectedIncome() { return expectedIncome; }
    public void setExpectedIncome(Double expectedIncome) { this.expectedIncome = expectedIncome; }
    public Double getExpectedExpense() { return expectedExpense; }
    public void setExpectedExpense(Double expectedExpense) { this.expectedExpense = expectedExpense; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BillingCycleBudget that = (BillingCycleBudget) o;
        return Objects.equals(id, that.id);
    }
    @Override
    public int hashCode() { return Objects.hash(id); }
}
