package com.countinghelper.repository;

import com.countinghelper.entity.UserSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserSettingRepository extends JpaRepository<UserSetting, Integer> {
    Optional<UserSetting> findByUserIdAndSettingKey(Integer userId, String settingKey);
}
