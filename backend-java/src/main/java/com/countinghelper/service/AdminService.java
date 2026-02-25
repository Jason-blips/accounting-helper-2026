package com.countinghelper.service;

import com.countinghelper.dto.response.UserResponse;
import com.countinghelper.entity.User;
import com.countinghelper.repository.TransactionRepository;
import com.countinghelper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        
        return users.stream().map(user -> {
            String role = (user.getRole() != null && !user.getRole().isEmpty() && !user.getRole().equals("null")) 
                ? user.getRole() : "user";
            
            long transactionCount = transactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).size();
            
            UserResponse response = new UserResponse();
            response.setId(user.getId());
            response.setUsername(user.getUsername());
            response.setEmail(user.getEmail());
            response.setRole(role);
            response.setCreatedAt(user.getCreatedAt());
            response.setTransactionCount((int) transactionCount);
            
            return response;
        }).collect(Collectors.toList());
    }
    
    public Map<String, Object> getStats() {
        List<User> users = userRepository.findAll();
        long totalTransactions = transactionRepository.count();
        
        long totalUsers = users.size();
        long adminCount = users.stream()
            .filter(u -> "admin".equals(u.getRole()))
            .count();
        long userCount = users.stream()
            .filter(u -> !"admin".equals(u.getRole()))
            .count();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_users", totalUsers);
        stats.put("admin_count", adminCount);
        stats.put("user_count", userCount);
        stats.put("total_transactions", totalTransactions);
        
        return stats;
    }
    
    @Transactional
    public void deleteUser(Integer adminId, Integer userId) {
        if (adminId.equals(userId)) {
            throw new RuntimeException("不能删除自己的账户");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        // 删除用户的所有交易
        List<com.countinghelper.entity.Transaction> transactions = 
            transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        transactionRepository.deleteAll(transactions);
        
        // 删除用户
        userRepository.delete(user);
    }
    
    public boolean isAdmin(Integer userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        String role = (user.getRole() != null && !user.getRole().isEmpty() && !user.getRole().equals("null")) 
            ? user.getRole() : "user";
        
        return "admin".equals(role);
    }
}
