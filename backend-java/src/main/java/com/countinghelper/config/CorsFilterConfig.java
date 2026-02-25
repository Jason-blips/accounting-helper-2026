package com.countinghelper.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class CorsFilterConfig {

    @Bean
    public FilterRegistrationBean<CorsPreflightFilter> corsPreflightFilterRegistration() {
        FilterRegistrationBean<CorsPreflightFilter> registration = new FilterRegistrationBean<>(new CorsPreflightFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }
}
