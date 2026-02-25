package com.countinghelper.controller;

import com.countinghelper.dto.request.AnalysisRequest;
import com.countinghelper.dto.response.AnalysisResponse;
import com.countinghelper.service.AnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {
    
    @Autowired
    private AnalysisService analysisService;
    
    @PostMapping
    public ResponseEntity<AnalysisResponse> analyze(
            Authentication authentication,
            @RequestBody(required = false) AnalysisRequest request) {
        Integer userId;
        if (authentication != null && authentication.getPrincipal() != null) {
            userId = (Integer) authentication.getPrincipal();
        } else {
            userId = 1; // 默认使用userId=1（manager用户）
        }
        String period = (request != null && request.getPeriod() != null) 
            ? request.getPeriod() : "all";
        
        AnalysisResponse response = analysisService.analyze(userId, period);
        return ResponseEntity.ok(response);
    }
}
