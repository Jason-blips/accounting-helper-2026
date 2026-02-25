package com.countinghelper.controller;

import com.countinghelper.dto.request.CurrencyConvertRequest;
import com.countinghelper.service.CurrencyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/currency")
public class CurrencyController {
    
    @Autowired
    private CurrencyService currencyService;
    
    @PostMapping("/convert")
    public ResponseEntity<?> convert(@Valid @RequestBody CurrencyConvertRequest request) {
        try {
            Map<String, Object> result = currencyService.convert(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
