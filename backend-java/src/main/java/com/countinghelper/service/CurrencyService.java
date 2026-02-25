package com.countinghelper.service;

import com.countinghelper.dto.request.CurrencyConvertRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class CurrencyService {
    
    private static final Map<String, Map<String, Double>> EXCHANGE_RATES = new HashMap<>();
    
    static {
        Map<String, Double> gbpRates = new HashMap<>();
        gbpRates.put("GBP", 1.0);
        gbpRates.put("CNY", 9.09);
        gbpRates.put("USD", 1.27);
        gbpRates.put("EUR", 1.16);
        EXCHANGE_RATES.put("GBP", gbpRates);
        
        Map<String, Double> cnyRates = new HashMap<>();
        cnyRates.put("GBP", 0.11);
        cnyRates.put("CNY", 1.0);
        cnyRates.put("USD", 0.14);
        cnyRates.put("EUR", 0.13);
        EXCHANGE_RATES.put("CNY", cnyRates);
        
        Map<String, Double> usdRates = new HashMap<>();
        usdRates.put("GBP", 0.79);
        usdRates.put("CNY", 7.14);
        usdRates.put("USD", 1.0);
        usdRates.put("EUR", 0.91);
        EXCHANGE_RATES.put("USD", usdRates);
        
        Map<String, Double> eurRates = new HashMap<>();
        eurRates.put("GBP", 0.86);
        eurRates.put("CNY", 7.83);
        eurRates.put("USD", 1.10);
        eurRates.put("EUR", 1.0);
        EXCHANGE_RATES.put("EUR", eurRates);
    }
    
    public Map<String, Object> convert(CurrencyConvertRequest request) {
        Map<String, Double> rates = EXCHANGE_RATES.get(request.getFrom());
        if (rates == null) {
            throw new RuntimeException("不支持的货币");
        }
        
        Double rate = rates.get(request.getTo());
        if (rate == null) {
            throw new RuntimeException("不支持的货币");
        }
        
        double convertedAmount = request.getAmount() * rate;
        
        Map<String, Object> result = new HashMap<>();
        result.put("amount", request.getAmount());
        result.put("from", request.getFrom());
        result.put("to", request.getTo());
        result.put("convertedAmount", String.format("%.2f", convertedAmount));
        result.put("rate", rate);
        
        return result;
    }
}
