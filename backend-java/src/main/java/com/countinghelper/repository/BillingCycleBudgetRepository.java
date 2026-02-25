package com.countinghelper.repository;

import com.countinghelper.entity.BillingCycleBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BillingCycleBudgetRepository extends JpaRepository<BillingCycleBudget, Integer> {
    Optional<BillingCycleBudget> findByUserIdAndCycleStart(Integer userId, String cycleStart);
}
