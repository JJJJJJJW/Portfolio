package com.ace.techfolio.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Migration runner to alter app_users table column constraints on startup.
 * Drop NOT NULL constraints from currency and risk_appetite columns to prevent
 * SQL insertion errors during Google OAuth first-time login when user preferences are unset.
 */
@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("[DatabaseMigrationRunner] Running migration to drop NOT NULL constraints on app_users columns...");
        try {
            jdbcTemplate.execute("ALTER TABLE app_users ALTER COLUMN currency DROP NOT NULL");
            jdbcTemplate.execute("ALTER TABLE app_users ALTER COLUMN risk_appetite DROP NOT NULL");
            log.info("[DatabaseMigrationRunner] Table altered successfully: dropped NOT NULL constraints on currency and risk_appetite.");
        } catch (Exception e) {
            log.warn("[DatabaseMigrationRunner] Table alter query warning: {}", e.getMessage());
        }
    }
}
