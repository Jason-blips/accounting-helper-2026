package com.countinghelper.repository;

import com.countinghelper.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    List<Transaction> findByUserIdOrderByCreatedAtDesc(Integer userId);

    Page<Transaction> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);

    @Query(value = "SELECT * FROM transactions WHERE user_id = :userId AND DATE(created_at) = DATE(:date) ORDER BY created_at DESC", nativeQuery = true)
    List<Transaction> findByUserIdAndDate(@Param("userId") Integer userId, @Param("date") String date);

    @Query(value = "SELECT * FROM transactions WHERE user_id = :userId AND DATE(created_at) = DATE(:date) ORDER BY created_at DESC",
           countQuery = "SELECT COUNT(*) FROM transactions WHERE user_id = :userId AND DATE(created_at) = DATE(:date)",
           nativeQuery = true)
    Page<Transaction> findByUserIdAndDatePaged(@Param("userId") Integer userId, @Param("date") String date, Pageable pageable);

    List<Transaction> findByUserIdAndCreatedAtBetween(
        Integer userId, LocalDateTime start, LocalDateTime end);

    Page<Transaction> findByUserIdAndCreatedAtBetween(
        Integer userId, LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.createdAt >= :start ORDER BY t.createdAt DESC")
    List<Transaction> findByUserIdAndCreatedAtAfter(@Param("userId") Integer userId, @Param("start") LocalDateTime start);
    
    boolean existsByIdAndUserId(Integer id, Integer userId);
    
    void deleteByIdAndUserId(Integer id, Integer userId);
}
