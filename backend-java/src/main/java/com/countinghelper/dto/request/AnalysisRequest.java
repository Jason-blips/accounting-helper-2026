package com.countinghelper.dto.request;

public class AnalysisRequest {
    private String period = "all"; // day, 3days, week, month, all
    
    public AnalysisRequest() {
    }
    
    public String getPeriod() {
        return period;
    }
    
    public void setPeriod(String period) {
        this.period = period;
    }
}
