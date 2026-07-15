package com.ace.techfolio.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationConfig.class);

    @Bean
    public CommandLineRunner runMigration(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                log.info("Running database migration: check/add column 'model' to 'trading_signals'...");
                jdbcTemplate.execute("ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS model VARCHAR(50)");
                log.info("Database migration complete.");
            } catch (Exception e) {
                log.error("Failed to run database migration: {}", e.getMessage());
            }
        };
    }
}
