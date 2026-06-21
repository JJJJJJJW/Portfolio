package com.ace.techfolio.controller;

import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.service.stockanalyzer.StockAnalyzerOrchestrator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Internal controller for cron-triggered endpoints.
 *
 * <p>Secured by the {@code X-CRON-SECRET} header, validated against the
 * same {@code CRON_SECRET} environment variable used by
 * {@link CronController}.</p>
 *
 * <p>The {@code POST /trigger-daily-scan} endpoint instantly returns
 * {@code 202 Accepted} and hands off the full pipeline to an
 * {@code @Async} background thread. This satisfies the 30-second
 * timeout constraint of external cron services.</p>
 */
@RestController
@RequestMapping("/api/v1/internal")
public class InternalController {

    private static final Logger log = LoggerFactory.getLogger(InternalController.class);

    private final StockAnalyzerOrchestrator orchestrator;
    private final StockAnalyzerProperties props;

    public InternalController(StockAnalyzerOrchestrator orchestrator,
                               StockAnalyzerProperties props) {
        this.orchestrator = orchestrator;
        this.props = props;
    }

    /**
     * Triggers the daily stock analyzer pipeline.
     *
     * <p>Intended to be called daily at 6:30 PM ET by an external cron
     * service (e.g., cron-job.org, EasyCron).</p>
     *
     * <p>Security: Validates the {@code X-CRON-SECRET} header against
     * the {@code CRON_SECRET} environment variable.</p>
     *
     * <p>Behavior: Returns 202 immediately, runs pipeline async.</p>
     *
     * <p>Example cron config:</p>
     * <ul>
     *   <li>URL: {@code POST https://your-backend.onrender.com/api/v1/internal/trigger-daily-scan}</li>
     *   <li>Header: {@code X-Cron-Secret: your_secret_value}</li>
     *   <li>Schedule: Every day at 22:30 UTC (6:30 PM ET)</li>
     * </ul>
     */
    @PostMapping("/trigger-daily-scan")
    public ResponseEntity<Map<String, String>> triggerDailyScan(
            @RequestHeader(value = "X-Cron-Secret", required = false) String secret) {

        // Validate cron secret
        String expectedSecret = props.getSecurity().getCronSecret();
        if (expectedSecret == null || expectedSecret.isBlank()) {
            log.error("CRON_SECRET is not configured. Rejecting stock analyzer cron request.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Cron secret not configured on server."));
        }

        if (secret == null || !secret.equals(expectedSecret)) {
            log.warn("Unauthorized stock analyzer cron request — invalid or missing X-Cron-Secret.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or missing X-Cron-Secret."));
        }

        log.info("Authorized stock analyzer cron request received. Triggering async pipeline...");

        // Fire-and-forget: returns immediately, pipeline runs in background
        orchestrator.runFullPipelineAsync();

        return ResponseEntity.accepted()
                .body(Map.of(
                        "status", "accepted",
                        "message", "Stock analyzer pipeline triggered in background."));
    }
}
