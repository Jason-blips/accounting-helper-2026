package com.countinghelper.service;

import com.countinghelper.dto.request.TransactionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 解析 CSV（与导出格式一致：日期,类型,金额,货币,支付方式,分类,描述）并导入为交易。
 */
@Service
public class TransactionImportService {

    private static final DateTimeFormatter IMPORT_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter IMPORT_DATE_ONLY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final Pattern HEADER_PATTERN = Pattern.compile("^[\uFEFF]?日期,类型,金额,货币,支付方式,分类,描述");

    @Autowired
    private TransactionService transactionService;

    public static class ImportResult {
        public int imported;
        public int failed;
        public List<String> errors = new ArrayList<>();
    }

    /**
     * 解析 CSV 并为当前用户创建交易。CSV 首行为表头（可带 BOM），与导出格式一致。
     */
    public ImportResult importCsvForUser(int userId, byte[] csvBytes) {
        ImportResult result = new ImportResult();
        String content = new String(csvBytes, StandardCharsets.UTF_8);
        String[] lines = content.split("\\r?\\n");
        int lineNum = 0;
        for (String line : lines) {
            lineNum++;
            line = line.trim();
            if (line.isEmpty()) continue;
            if (HEADER_PATTERN.matcher(line).matches()) continue;
            String[] fields = parseCsvLine(line);
            if (fields.length < 5) {
                result.failed++;
                result.errors.add("第" + lineNum + "行：列数不足");
                continue;
            }
            String dateStr = fields.length > 0 ? fields[0].trim() : "";
            String typeStr = fields.length > 1 ? fields[1].trim() : "";
            String amountStr = fields.length > 2 ? fields[2].trim() : "";
            String currencyStr = fields.length > 3 ? fields[3].trim() : "";
            String paymentStr = fields.length > 4 ? fields[4].trim() : "";
            String categoryStr = fields.length > 5 ? fields[5].trim() : "";
            String descStr = fields.length > 6 ? fields[6].trim() : "";

            if (!"收入".equals(typeStr) && !"支出".equals(typeStr)) {
                result.failed++;
                result.errors.add("第" + lineNum + "行：类型须为「收入」或「支出」");
                continue;
            }
            double amount;
            try {
                amount = Double.parseDouble(amountStr.replace(",", ""));
            } catch (NumberFormatException e) {
                result.failed++;
                result.errors.add("第" + lineNum + "行：金额无效");
                continue;
            }
            if (currencyStr.isEmpty()) currencyStr = "GBP";
            if (paymentStr.isEmpty()) paymentStr = "银行卡转账";

            TransactionRequest req = new TransactionRequest();
            req.setAmount(amount);
            req.setCurrency(currencyStr);
            req.setPaymentMethod(paymentStr);
            req.setTransactionType(typeStr);
            req.setCategory(categoryStr.isEmpty() ? null : categoryStr);
            req.setDescription(descStr.isEmpty() ? null : descStr);
            String createdAt = parseDateForRequest(dateStr);
            req.setCreatedAt(createdAt);

            try {
                transactionService.createTransaction(userId, req);
                result.imported++;
            } catch (Exception e) {
                result.failed++;
                result.errors.add("第" + lineNum + "行：" + (e.getMessage() != null ? e.getMessage() : "导入失败"));
            }
        }
        return result;
    }

    /** 解析日期字符串为 API 接受的格式 yyyy-MM-dd 或 yyyy-MM-ddTHH:mm:ss */
    private static String parseDateForRequest(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            if (dateStr.length() <= 10) {
                LocalDateTime parsed = LocalDateTime.parse(dateStr + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                return parsed.format(DateTimeFormatter.ISO_LOCAL_DATE);
            }
            LocalDateTime parsed = LocalDateTime.parse(dateStr, IMPORT_DATE);
            return parsed.format(DateTimeFormatter.ISO_LOCAL_DATE) + "T" + parsed.format(DateTimeFormatter.ISO_LOCAL_TIME);
        } catch (Exception e) {
            try {
                LocalDateTime parsed = LocalDateTime.parse(dateStr + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                return parsed.format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (Exception e2) {
                return null;
            }
        }
    }

    /** 简单 CSV 行解析：支持引号包裹的字段（内含逗号、换行、双引号转义） */
    private static String[] parseCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        cur.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    out.add(cur.toString());
                    cur.setLength(0);
                } else {
                    cur.append(c);
                }
            }
        }
        out.add(cur.toString());
        return out.toArray(new String[0]);
    }
}
