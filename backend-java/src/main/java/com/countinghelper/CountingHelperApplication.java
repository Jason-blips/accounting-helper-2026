package com.countinghelper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableAsync
public class CountingHelperApplication {
    private static final Logger logger = LoggerFactory.getLogger(CountingHelperApplication.class);
    
    public static void main(String[] args) {
        logger.info("========================================");
        logger.info("Starting Counting Helper Backend...");
        logger.info("========================================");
        SpringApplication.run(CountingHelperApplication.class, args);
        logger.info("========================================");
        logger.info("Counting Helper Backend Started!");
        logger.info("Server: http://localhost:8000/api");
        logger.info("Health: http://localhost:8000/api/health");
        logger.info("========================================");
    }
}
