package com.countinghelper.service;

import com.countinghelper.entity.BillingCycleBudget;
import com.countinghelper.entity.Transaction;
import com.countinghelper.repository.BillingCycleBudgetRepository;
import com.countinghelper.repository.TransactionRepository;
import com.countinghelper.repository.UserSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class BillingCycleService {

    private static final String KEY_REPAYMENT_DAY = "repayment_day";
    private static final String KEY_TIMEZONE = "timezone";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    @Autowired
    private UserSettingRepository userSettingRepository;
    @Autowired
    private BillingCycleBudgetRepository budgetRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Get repayment day (1-31). Default 15 if not set. */
    public int getRepaymentDay(Integer userId) {
        return userSettingRepository.findByUserIdAndSettingKey(userId, KEY_REPAYMENT_DAY)
            .map(us -> {
                try {
                    int d = Integer.parseInt(us.getSettingValue());
                    return Math.max(1, Math.min(31, d));
                } catch (NumberFormatException e) {
                    return 15;
                }
            })
            .orElse(15);
    }

    /** Get timezone (e.g. Asia/Shanghai, Europe/London). Default Europe/London. */
    public String getTimezone(Integer userId) {
        return userSettingRepository.findByUserIdAndSettingKey(userId, KEY_TIMEZONE)
            .map(us -> {
                String v = us.getSettingValue();
                return (v != null && !v.isEmpty()) ? v : "Europe/London";
            })
            .orElse("Europe/London");
    }

    @Transactional
    public void setTimezone(Integer userId, String timezone) {
        String normalized = (timezone != null && !timezone.isEmpty()) ? timezone : "Europe/London";
        int updated = jdbcTemplate.update(
            "UPDATE user_settings SET setting_value = ? WHERE user_id = ? AND setting_key = ?",
            normalized, userId, KEY_TIMEZONE);
        if (updated == 0) {
            jdbcTemplate.update(
                "INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)",
                userId, KEY_TIMEZONE, normalized);
        }
    }

    /** 确保 user_settings / billing_cycle_budget 表存在（首次设置还款日时自动建表） */
    private void ensureUserSettingsTable() {
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS user_settings (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  user_id INTEGER NOT NULL," +
            "  setting_key TEXT NOT NULL," +
            "  setting_value TEXT," +
            "  UNIQUE(user_id, setting_key)" +
            ")");
        jdbcTemplate.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key)");
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS billing_cycle_budget (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  user_id INTEGER NOT NULL," +
            "  cycle_start TEXT NOT NULL," +
            "  expected_income REAL," +
            "  expected_expense REAL," +
            "  UNIQUE(user_id, cycle_start)" +
            ")");
        jdbcTemplate.execute(
            "CREATE INDEX IF NOT EXISTS idx_billing_cycle_budget_user ON billing_cycle_budget(user_id, cycle_start)");
    }

    /**
     * 使用 JdbcTemplate 做 UPDATE 或 INSERT，避免 SQLite 下 JPA save 新记录时
     * getGeneratedKeys 不可用导致设置失败。若表不存在则自动建表后重试。
     */
    @Transactional
    public void setRepaymentDay(Integer userId, int day) {
        int clamped = Math.max(1, Math.min(31, day));
        String value = String.valueOf(clamped);
        try {
            doSetRepaymentDay(userId, value);
        } catch (DataAccessException e) {
            String msg = (e.getMessage() != null ? e.getMessage() : "") +
                (e.getCause() != null && e.getCause().getMessage() != null ? " " + e.getCause().getMessage() : "");
            if (msg.contains("no such table") || msg.contains("user_settings")) {
                ensureUserSettingsTable();
                doSetRepaymentDay(userId, value);
            } else {
                throw new RuntimeException("保存还款日失败: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
            }
        }
    }

    private void doSetRepaymentDay(Integer userId, String value) {
        int updated = jdbcTemplate.update(
            "UPDATE user_settings SET setting_value = ? WHERE user_id = ? AND setting_key = ?",
            value, userId, KEY_REPAYMENT_DAY);
        if (updated == 0) {
            jdbcTemplate.update(
                "INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)",
                userId, KEY_REPAYMENT_DAY, value);
        }
    }

    /** One cycle: start (inclusive) and end (inclusive). */
    public static class CycleRange {
        public final String startDate;
        public final String endDate;
        public CycleRange(String startDate, String endDate) {
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }

    /** List cycle ranges that overlap [fromInclusive, toInclusive]. */
    public List<CycleRange> listCycles(Integer userId, String fromInclusive, String toInclusive) {
        int repaymentDay = getRepaymentDay(userId);
        LocalDate from = LocalDate.parse(fromInclusive, FMT);
        LocalDate to = LocalDate.parse(toInclusive, FMT);
        List<CycleRange> list = new ArrayList<>();
        // First cycle start that contains `from`
        LocalDate cycleStart;
        if (from.getDayOfMonth() >= repaymentDay) {
            cycleStart = from.withDayOfMonth(Math.min(repaymentDay, from.lengthOfMonth()));
        } else {
            LocalDate prev = from.minusMonths(1);
            cycleStart = prev.withDayOfMonth(Math.min(repaymentDay, prev.lengthOfMonth()));
        }
        while (!cycleStart.isAfter(to)) {
            LocalDate cycleEnd = cycleStart.plusMonths(1).minusDays(1);
            if (cycleEnd.isAfter(to)) cycleEnd = to;
            list.add(new CycleRange(cycleStart.format(FMT), cycleEnd.format(FMT)));
            LocalDate nextMonth = cycleStart.plusMonths(1);
            cycleStart = nextMonth.withDayOfMonth(Math.min(repaymentDay, nextMonth.lengthOfMonth()));
        }
        return list;
    }

    /** DTO for one cycle with stats and optional budget. */
    public static class CycleDto {
        public String startDate;
        public String endDate;
        public double income;
        public double expense;
        public double balance;
        public int incomeCount;
        public int expenseCount;
        public Double expectedIncome;
        public Double expectedExpense;
    }

    public List<CycleDto> listCyclesWithStats(Integer userId, String fromInclusive, String toInclusive) {
        List<CycleRange> ranges = listCycles(userId, fromInclusive, toInclusive);
        List<CycleDto> result = new ArrayList<>();
        for (CycleRange r : ranges) {
            CycleDto dto = new CycleDto();
            dto.startDate = r.startDate;
            dto.endDate = r.endDate;
            List<Transaction> tx = transactionRepository.findByUserIdAndCreatedAtBetween(
                userId,
                java.time.LocalDateTime.parse(r.startDate + "T00:00:00"),
                java.time.LocalDateTime.parse(r.endDate + "T23:59:59")
            );
            double income = 0, expense = 0;
            int inc = 0, exp = 0;
            for (Transaction t : tx) {
                if ("收入".equals(t.getTransactionType())) {
                    income += t.getAmountInGbp();
                    inc++;
                } else {
                    expense += t.getAmountInGbp();
                    exp++;
                }
            }
            dto.income = income;
            dto.expense = expense;
            dto.balance = income - expense;
            dto.incomeCount = inc;
            dto.expenseCount = exp;
            budgetRepository.findByUserIdAndCycleStart(userId, r.startDate).ifPresent(b -> {
                dto.expectedIncome = b.getExpectedIncome();
                dto.expectedExpense = b.getExpectedExpense();
            });
            result.add(dto);
        }
        return result;
    }

    public Optional<BillingCycleBudget> getBudget(Integer userId, String cycleStart) {
        return budgetRepository.findByUserIdAndCycleStart(userId, cycleStart);
    }

    @Transactional
    public void setBudget(Integer userId, String cycleStart, Double expectedIncome, Double expectedExpense) {
        BillingCycleBudget b = budgetRepository.findByUserIdAndCycleStart(userId, cycleStart)
            .orElseGet(() -> {
                BillingCycleBudget x = new BillingCycleBudget();
                x.setUserId(userId);
                x.setCycleStart(cycleStart);
                return x;
            });
        b.setExpectedIncome(expectedIncome);
        b.setExpectedExpense(expectedExpense);
        budgetRepository.save(b);
    }
}
