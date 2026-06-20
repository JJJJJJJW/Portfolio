package com.ace.techfolio.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("message", "Techfolio Backend is fully operational");

        // Test database connectivity
        Map<String, Object> database = new LinkedHashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            database.put("status", "UP");
            database.put("database", conn.getCatalog());
            database.put("validConnection", conn.isValid(3));
        } catch (Exception e) {
            database.put("status", "DOWN");
            database.put("error", e.getMessage());
            response.put("status", "DEGRADED");
        }
        response.put("database", database);

        return ResponseEntity.ok(response);
    }

    /**
     * Ultra-lightweight keep-alive ping — no DB, no auth, no allocations.
     * Point cronjob.org here every 5–14 minutes to prevent Render from sleeping.
     */
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
