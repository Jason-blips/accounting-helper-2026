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
import java.time.format.DateTimeFormatter;
import java.util.*;

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
        
        prompt.append("\n【汇总统计】\n");
        prompt.append("- 总收入：").append(String.format("%.2f", stats.get("income"))).append(" GBP\n");
        prompt.append("- 总支出：").append(String.format("%.2f", stats.get("expense"))).append(" GBP\n");
        prompt.append("- 余额：").append(String.format("%.2f", stats.get("balance"))).append(" GBP\n");
        prompt.append("- 平均每日支出：").append(String.format("%.2f", stats.get("avgDailyExpense"))).append(" GBP\n");

        if (!dailyStats.isEmpty()) {
            prompt.append("\n【按日统计】\n");
            dailyStats.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Double> day = (Map<String, Double>) e.getValue();
                    double in = day.getOrDefault("income", 0.0);
                    double out = day.getOrDefault("expense", 0.0);
                    prompt.append("- ").append(e.getKey()).append(": 收入 ").append(String.format("%.2f", in))
                        .append(" GBP, 支出 ").append(String.format("%.2f", out)).append(" GBP\n");
                });
        }

        if (!paymentMethodStats.isEmpty()) {
            prompt.append("\n【按支付方式】\n");
            paymentMethodStats.forEach((method, data) -> {
                @SuppressWarnings("unchecked")
                Map<String, Double> m = (Map<String, Double>) data;
                double in = m.getOrDefault("income", 0.0);
                double out = m.getOrDefault("expense", 0.0);
                prompt.append("- ").append(method).append(": 收入 ").append(String.format("%.2f", in))
                    .append(" GBP, 支出 ").append(String.format("%.2f", out)).append(" GBP\n");
            });
        }

        if (!categoryStats.isEmpty()) {
            prompt.append("\n【按分类】\n");
            categoryStats.entrySet().stream()
                .sorted((a, b) -> {
                    @SuppressWarnings("unchecked")
                    double expA = ((Map<String, Double>) a.getValue()).getOrDefault("expense", 0.0);
                    @SuppressWarnings("unchecked")
                    double expB = ((Map<String, Double>) b.getValue()).getOrDefault("expense", 0.0);
                    return Double.compare(expB, expA);
                })
                .forEach(e -> {
                    String cat = "未分类".equals(e.getKey()) ? "(未分类)" : e.getKey();
                    @SuppressWarnings("unchecked")
                    Map<String, Double> m = (Map<String, Double>) e.getValue();
                    double in = m.getOrDefault("income", 0.0);
                    double out = m.getOrDefault("expense", 0.0);
                    prompt.append("- ").append(cat).append(": 收入 ").append(String.format("%.2f", in))
                        .append(" GBP, 支出 ").append(String.format("%.2f", out)).append(" GBP\n");
                });
        }

        prompt.append("\n请结合以上按日、按支付方式、按分类的统计，提供详细的分析和可操作的建议，用中文回复。");
        
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
    
    /** 按日期汇总收入/支出，key 为 yyyy-MM-dd */
    private Map<String, Object> calculateDailyStats(List<Transaction> transactions) {
        Map<String, Map<String, Double>> dailyMap = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        for (Transaction t : transactions) {
            if (t.getCreatedAt() == null) continue;
            String date = t.getCreatedAt().toLocalDate().format(fmt);
            dailyMap.putIfAbsent(date, new HashMap<>(Map.of("income", 0.0, "expense", 0.0)));
            Map<String, Double> day = dailyMap.get(date);
            double gbp = t.getAmountInGbp() != null ? t.getAmountInGbp() : 0;
            if ("收入".equals(t.getTransactionType())) {
                day.put("income", day.get("income") + gbp);
            } else {
                day.put("expense", day.get("expense") + gbp);
            }
        }
        return new HashMap<>(dailyMap);
    }

    /** 按支付方式汇总收入/支出 */
    private Map<String, Object> calculatePaymentMethodStats(List<Transaction> transactions) {
        Map<String, Map<String, Double>> byMethod = new LinkedHashMap<>();
        for (Transaction t : transactions) {
            String method = t.getPaymentMethod() != null && !t.getPaymentMethod().isEmpty()
                ? t.getPaymentMethod() : "未填写";
            byMethod.putIfAbsent(method, new HashMap<>(Map.of("income", 0.0, "expense", 0.0)));
            Map<String, Double> m = byMethod.get(method);
            double gbp = t.getAmountInGbp() != null ? t.getAmountInGbp() : 0;
            if ("收入".equals(t.getTransactionType())) {
                m.put("income", m.get("income") + gbp);
            } else {
                m.put("expense", m.get("expense") + gbp);
            }
        }
        return new HashMap<>(byMethod);
    }

    /** 按分类汇总收入/支出 */
    private Map<String, Object> calculateCategoryStats(List<Transaction> transactions) {
        Map<String, Map<String, Double>> byCategory = new LinkedHashMap<>();
        for (Transaction t : transactions) {
            String cat = t.getCategory() != null && !t.getCategory().isEmpty()
                ? t.getCategory() : "未分类";
            byCategory.putIfAbsent(cat, new HashMap<>(Map.of("income", 0.0, "expense", 0.0)));
            Map<String, Double> m = byCategory.get(cat);
            double gbp = t.getAmountInGbp() != null ? t.getAmountInGbp() : 0;
            if ("收入".equals(t.getTransactionType())) {
                m.put("income", m.get("income") + gbp);
            } else {
                m.put("expense", m.get("expense") + gbp);
            }
        }
        return new HashMap<>(byCategory);
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
