package com.countinghelper.dto.response;

public class AnalysisResponse {
    private String analysis;
    private String model;
    private String error;
    
    public AnalysisResponse() {
    }
    
    public AnalysisResponse(String analysis, String model, String error) {
        this.analysis = analysis;
        this.model = model;
        this.error = error;
    }
    
    public String getAnalysis() {
        return analysis;
    }
    
    public void setAnalysis(String analysis) {
        this.analysis = analysis;
    }
    
    public String getModel() {
        return model;
    }
    
    public void setModel(String model) {
        this.model = model;
    }
    
    public String getError() {
        return error;
    }
    
    public void setError(String error) {
        this.error = error;
    }
}
