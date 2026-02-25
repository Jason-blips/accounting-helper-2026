package com.countinghelper.controller;

import com.countinghelper.service.BillingCycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @Autowired
    private BillingCycleService billingCycleService;

    private Integer getUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() != null) {
            Object p = auth.getPrincipal();
            if (p instanceof Number) return ((Number) p).intValue();
            if (p instanceof Integer) return (Integer) p;
        }
        return 1;
    }

    @GetMapping("/repayment-day")
    public ResponseEntity<?> getRepaymentDay(Authentication authentication) {
        int day = billingCycleService.getRepaymentDay(getUserId(authentication));
        return ResponseEntity.ok(Map.of("repaymentDay", day));
    }

    @GetMapping("/timezone")
    public ResponseEntity<?> getTimezone(Authentication authentication) {
        String tz = billingCycleService.getTimezone(getUserId(authentication));
        return ResponseEntity.ok(Map.of("timezone", tz));
    }

    @PutMapping("/timezone")
    public ResponseEntity<?> setTimezone(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        Object raw = body != null ? body.get("timezone") : null;
        if (raw == null || raw.toString().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "timezone required"));
        }
        String tz = raw.toString().trim();
        billingCycleService.setTimezone(getUserId(authentication), tz);
        return ResponseEntity.ok(Map.of("timezone", billingCycleService.getTimezone(getUserId(authentication))));
    }

    @PutMapping("/repayment-day")
    public ResponseEntity<?> setRepaymentDay(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        Object raw = body != null ? body.get("repaymentDay") : null;
        if (raw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "repaymentDay required"));
        }
        int day;
        if (raw instanceof Number) {
            day = ((Number) raw).intValue();
        } else {
            try {
                day = Integer.parseInt(raw.toString().trim());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "repaymentDay 应为 1-31 的数字"));
            }
        }
        try {
            billingCycleService.setRepaymentDay(getUserId(authentication), day);
            return ResponseEntity.ok(Map.of("repaymentDay", billingCycleService.getRepaymentDay(getUserId(authentication))));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "设置失败"));
        }
    }
}
