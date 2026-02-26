package com.countinghelper.service;

import com.countinghelper.entity.Transaction;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class TransactionExportService {

    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /**
     * Export transactions to CSV (UTF-8 with BOM for Excel compatibility).
     */
    public byte[] exportToCsv(List<Transaction> transactions) {
        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM so Excel recognizes encoding
        sb.append('\uFEFF');
        sb.append("日期,类型,金额,货币,支付方式,分类,描述\n");
        for (Transaction t : transactions) {
            String date = t.getCreatedAt() != null ? t.getCreatedAt().format(DATE_TIME_FORMAT) : "";
            sb.append(escapeCsv(date)).append(",");
            sb.append(escapeCsv(t.getTransactionType())).append(",");
            sb.append(t.getAmount() != null ? t.getAmount() : "").append(",");
            sb.append(escapeCsv(t.getCurrency())).append(",");
            sb.append(escapeCsv(t.getPaymentMethod())).append(",");
            sb.append(escapeCsv(t.getCategory())).append(",");
            sb.append(escapeCsv(t.getDescription())).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * Export transactions to Excel (.xlsx).
     */
    public byte[] exportToExcel(List<Transaction> transactions) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("交易记录");
            Row headerRow = sheet.createRow(0);
            String[] headers = {"日期", "类型", "金额", "货币", "支付方式", "分类", "描述"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            int rowNum = 1;
            for (Transaction t : transactions) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(t.getCreatedAt() != null ? t.getCreatedAt().format(DATE_TIME_FORMAT) : "");
                row.createCell(1).setCellValue(t.getTransactionType() != null ? t.getTransactionType() : "");
                row.createCell(2).setCellValue(t.getAmount() != null ? t.getAmount() : 0);
                row.createCell(3).setCellValue(t.getCurrency() != null ? t.getCurrency() : "");
                row.createCell(4).setCellValue(t.getPaymentMethod() != null ? t.getPaymentMethod() : "");
                row.createCell(5).setCellValue(t.getCategory() != null ? t.getCategory() : "");
                row.createCell(6).setCellValue(t.getDescription() != null ? t.getDescription() : "");
            }
            // Auto-size columns (optional, can be slow for large data)
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
