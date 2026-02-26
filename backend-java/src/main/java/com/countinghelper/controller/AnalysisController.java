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
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        Integer userId = (Integer) authentication.getPrincipal();
        String period = (request != null && request.getPeriod() != null)
            ? request.getPeriod() : "all";
        AnalysisResponse response = analysisService.analyze(userId, period);
        return ResponseEntity.ok(response);
    }
}
