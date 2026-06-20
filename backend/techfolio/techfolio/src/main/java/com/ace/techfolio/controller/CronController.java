package com.ace.techfolio.controller;

import com.ace.techfolio.service.PortfolioSnapshotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller exposing cron-triggered endpoints for external job schedulers
 * (e.g. cronjob.org, cron-job.org, EasyCron).
 *
 * <p>All endpoints are protected by a shared secret passed in the
 * {@code X-Cron-Secret} header, validated against the {@code CRON_SECRET}
 * environment variable. This keeps the endpoint publicly accessible
 * (no JWT required) but prevents unauthorized invocations.</p>
 *
 * <p>This approach avoids Spring's {@code @Scheduled} and its background
 * thread pool, conserving memory on the 512MB Render free tier.</p>
 */
@RestController
@RequestMapping("/api/v1/cron")
public class CronController {

    private static final Logger log = LoggerFactory.getLogger(CronController.class);

    private final PortfolioSnapshotService snapshotService;

    @Value("${CRON_SECRET:}")
    private String cronSecret;

    public CronController(PortfolioSnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    /**
     * Triggers the end-of-day portfolio snapshot pipeline:
     * refreshes all asset prices → inserts daily snapshot rows.
     *
     * <p>Intended to be called once daily by an external cron service.
     * Example cronjob.org config:
     * <ul>
     *   <li>URL: {@code POST https://your-backend.onrender.com/api/v1/cron/eod-snapshot}</li>
     *   <li>Header: {@code X-Cron-Secret: your_secret_value}</li>
     *   <li>Schedule: Every day at 00:05 UTC</li>
     * </ul>
     */
    @PostMapping("/eod-snapshot")
    public ResponseEntity<Map<String, String>> triggerEodSnapshot(
            @RequestHeader(value = "X-Cron-Secret", required = false) String secret) {

        // Validate the cron secret
        if (cronSecret == null || cronSecret.isBlank()) {
            log.error("CRON_SECRET environment variable is not configured. Rejecting cron request.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Cron secret not configured on server."));
        }

        if (secret == null || !secret.equals(cronSecret)) {
            log.warn("Unauthorized cron request — invalid or missing X-Cron-Secret header.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or missing X-Cron-Secret."));
        }

        log.info("Authorized cron request received. Starting EOD snapshot...");

        try {
            String result = snapshotService.executeSnapshot();
            return ResponseEntity.ok(Map.of("status", "success", "message", result));
        } catch (Exception e) {
            log.error("EOD snapshot failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Snapshot failed: " + e.getMessage()));
        }
    }
}
