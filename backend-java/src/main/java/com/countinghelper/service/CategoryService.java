package com.countinghelper.service;

import com.countinghelper.entity.UserCategory;
import com.countinghelper.repository.UserCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private UserCategoryRepository userCategoryRepository;

    public List<UserCategory> listByUserId(Integer userId) {
        return userCategoryRepository.findByUserIdOrderByDisplayOrderAscIdAsc(userId);
    }

    @Transactional
    public UserCategory create(Integer userId, String name) {
        if (name == null || (name = name.trim()).isEmpty()) {
            throw new RuntimeException("分类名称不能为空");
        }
        if (userCategoryRepository.existsByUserIdAndName(userId, name)) {
            throw new RuntimeException("该分类已存在");
        }
        int nextOrder = userCategoryRepository.findByUserIdOrderByDisplayOrderAscIdAsc(userId).size();
        UserCategory c = new UserCategory();
        c.setUserId(userId);
        c.setName(name);
        c.setDisplayOrder(nextOrder);
        return userCategoryRepository.save(c);
    }

    @Transactional
    public UserCategory update(Integer userId, Integer id, String name) {
        if (name == null || (name = name.trim()).isEmpty()) {
            throw new RuntimeException("分类名称不能为空");
        }
        UserCategory c = userCategoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("分类不存在"));
        if (!c.getName().equals(name) && userCategoryRepository.existsByUserIdAndName(userId, name)) {
            throw new RuntimeException("该分类名称已存在");
        }
        c.setName(name);
        return userCategoryRepository.save(c);
    }

    @Transactional
    public void delete(Integer userId, Integer id) {
        if (!userCategoryRepository.findByIdAndUserId(id, userId).isPresent()) {
            throw new RuntimeException("分类不存在");
        }
        userCategoryRepository.deleteByIdAndUserId(id, userId);
    }
}
