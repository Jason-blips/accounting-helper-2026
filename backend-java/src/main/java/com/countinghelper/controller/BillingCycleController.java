package com.countinghelper.controller;

import com.countinghelper.service.BillingCycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing-cycles")
public class BillingCycleController {

    @Autowired
    private BillingCycleService billingCycleService;

    private Integer getUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new org.springframework.security.access.AccessDeniedException("未认证");
        }
        return (Integer) auth.getPrincipal();
    }

    /** List cycles with stats (and budget if set). from/to in YYYY-MM-DD. */
    @GetMapping
    public ResponseEntity<?> listCycles(
            Authentication authentication,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        Integer userId = getUserId(authentication);
        String fromDate = from != null && !from.isEmpty() ? from : "2020-01-01";
        String toDate = to != null && !to.isEmpty() ? to : java.time.LocalDate.now().toString();
        List<BillingCycleService.CycleDto> list = billingCycleService.listCyclesWithStats(userId, fromDate, toDate);
        return ResponseEntity.ok(list);
    }

    @PutMapping("/budget")
    public ResponseEntity<?> setBudget(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        Integer userId = getUserId(authentication);
        String cycleStart = (String) body.get("cycleStart");
        if (cycleStart == null || cycleStart.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "cycleStart required"));
        }
        Double expectedIncome = body.get("expectedIncome") != null ? ((Number) body.get("expectedIncome")).doubleValue() : null;
        Double expectedExpense = body.get("expectedExpense") != null ? ((Number) body.get("expectedExpense")).doubleValue() : null;
        billingCycleService.setBudget(userId, cycleStart, expectedIncome, expectedExpense);
        return ResponseEntity.ok(Map.of("message", "ok"));
    }
}
