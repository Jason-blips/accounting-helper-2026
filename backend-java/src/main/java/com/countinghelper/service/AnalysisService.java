package com.countinghelper.service;

import com.countinghelper.dto.response.AnalysisResponse;
import com.countinghelper.entity.Transaction;
import com.countinghelper.repository.TransactionRepository;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.service.OpenAiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalysisService {
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Value("${openai.api-key:}")
    private String openaiApiKey;
    
    public AnalysisResponse analyze(Integer userId, String period) {
        List<Transaction> transactions = getTransactionsByPeriod(userId, period);
        
        if (openaiApiKey == null || openaiApiKey.isEmpty()) {
            return new AnalysisResponse(generateBasicAnalysis(transactions), null, null);
        }
        
        try {
            OpenAiService service = new OpenAiService(openaiApiKey);
            
            String prompt = buildPrompt(transactions);
            
            ChatCompletionRequest chatRequest = ChatCompletionRequest.builder()
                .model("gpt-3.5-turbo")
                .messages(List.of(
                    new ChatMessage(ChatMessageRole.SYSTEM.value(), 
                        "你是一位专业、友好、细致的财务顾问，擅长从交易数据中提取关键信息，提供个性化、具体的财务建议。"),
                    new ChatMessage(ChatMessageRole.USER.value(), prompt)
                ))
                .maxTokens(2000)
                .temperature(0.7)
                .build();
            
            String analysis = service.createChatCompletion(chatRequest)
                .getChoices()
                .get(0)
                .getMessage()
                .getContent();
            
            return new AnalysisResponse(analysis, "gpt-3.5-turbo", null);
            
        } catch (Exception e) {
            return new AnalysisResponse(
                generateBasicAnalysis(transactions), 
                null, 
                "AI分析暂时不可用，已提供基础分析。"
            );
        }
    }
    
    private List<Transaction> getTransactionsByPeriod(Integer userId, String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = null;
        
        switch (period) {
            case "day":
                start = now.withHour(0).withMinute(0).withSecond(0);
                break;
            case "3days":
                start = now.minusDays(3);
                break;
            case "week":
                start = now.minusDays(7);
                break;
            case "month":
                start = now.minusDays(30);
                break;
            default:
                return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        
        if (start != null) {
            return transactionRepository.findByUserIdAndCreatedAtAfter(userId, start);
        }
        
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    private String buildPrompt(List<Transaction> transactions) {
        Map<String, Double> stats = calculateStats(transactions);
        Map<String, Object> dailyStats = calculateDailyStats(transactions);
        Map<String, Object> paymentMethodStats = calculatePaymentMethodStats(transactions);
        Map<String, Object> categoryStats = calculateCategoryStats(transactions);
        
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是一位专业的财务顾问，请基于以下用户的交易数据，提供详细、个性化、具体的财务分析和建议。\n\n");
        prompt.append("用户交易数据（").append(transactions.size()).append("笔交易）：\n");
        
        int limit = Math.min(transactions.size(), 50);
        for (int i = 0; i < limit; i++) {
            Transaction t = transactions.get(i);
            prompt.append(String.format("- %s: %.2f %s (%s, %s, %s)\n", 
                t.getDescription() != null ? t.getDescription() : "无描述",
                t.getAmount(), t.getCurrency(), t.getTransactionType(), 
                t.getPaymentMethod(), t.getCategory() != null ? t.getCategory() : "未分类"));
        }
        
        prompt.append("\n统计信息：\n");
        prompt.append("- 总收入：").append(String.format("%.2f", stats.get("income"))).append(" GBP\n");
        prompt.append("- 总支出：").append(String.format("%.2f", stats.get("expense"))).append(" GBP\n");
        prompt.append("- 余额：").append(String.format("%.2f", stats.get("balance"))).append(" GBP\n");
        prompt.append("- 平均每日支出：").append(String.format("%.2f", stats.get("avgDailyExpense"))).append(" GBP\n");
        
        prompt.append("\n请提供详细的分析和建议，用中文回复。");
        
        return prompt.toString();
    }
    
    private Map<String, Double> calculateStats(List<Transaction> transactions) {
        double income = 0.0;
        double expense = 0.0;
        
        for (Transaction t : transactions) {
            if ("收入".equals(t.getTransactionType())) {
                income += t.getAmountInGbp();
            } else {
                expense += t.getAmountInGbp();
            }
        }
        
        long days = transactions.stream()
            .map(t -> t.getCreatedAt().toLocalDate())
            .distinct()
            .count();
        
        double avgDailyExpense = days > 0 ? expense / days : 0;
        
        Map<String, Double> stats = new HashMap<>();
        stats.put("income", income);
        stats.put("expense", expense);
        stats.put("balance", income - expense);
        stats.put("avgDailyExpense", avgDailyExpense);
        
        return stats;
    }
    
    private Map<String, Object> calculateDailyStats(List<Transaction> transactions) {
        Map<String, Object> dailyMap = new HashMap<>();
        // 简化实现
        return dailyMap;
    }
    
    private Map<String, Object> calculatePaymentMethodStats(List<Transaction> transactions) {
        Map<String, Object> stats = new HashMap<>();
        // 简化实现
        return stats;
    }
    
    private Map<String, Object> calculateCategoryStats(List<Transaction> transactions) {
        Map<String, Object> stats = new HashMap<>();
        // 简化实现
        return stats;
    }
    
    private String generateBasicAnalysis(List<Transaction> transactions) {
        Map<String, Double> stats = calculateStats(transactions);
        
        return String.format(
            "📊 基础财务分析\n\n" +
            "💰 收入：%.2f GBP\n" +
            "💸 支出：%.2f GBP\n" +
            "💵 余额：%.2f GBP\n\n" +
            "📈 平均每日支出：%.2f GBP\n\n" +
            "💡 提示：配置OpenAI API Key可以获得更详细、个性化的AI分析建议。",
            stats.get("income"),
            stats.get("expense"),
            stats.get("balance"),
            stats.get("avgDailyExpense")
        );
    }
}
