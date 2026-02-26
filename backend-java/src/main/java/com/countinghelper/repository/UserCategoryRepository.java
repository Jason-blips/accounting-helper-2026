package com.countinghelper.repository;

import com.countinghelper.entity.UserCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCategoryRepository extends JpaRepository<UserCategory, Integer> {
    List<UserCategory> findByUserIdOrderByDisplayOrderAscIdAsc(Integer userId);

    Optional<UserCategory> findByIdAndUserId(Integer id, Integer userId);

    boolean existsByUserIdAndName(Integer userId, String name);

    void deleteByIdAndUserId(Integer id, Integer userId);
}
