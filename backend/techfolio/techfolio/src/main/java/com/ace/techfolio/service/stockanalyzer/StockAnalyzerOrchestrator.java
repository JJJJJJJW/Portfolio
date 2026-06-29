package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.dto.stockanalyzer.ScanResultResponse;
import com.ace.techfolio.dto.stockanalyzer.StockAnalysisMessage;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;
import com.ace.techfolio.service.queue.QueueService;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Top-level orchestrator for the Stock Analyzer two-stage pipeline.
 *
 * <p>Provides three execution modes:</p>
 * <ul>
 *   <li>{@link #runFullPipelineAsync()} — Asynchronous execution on the
 *       {@code stockAnalyzerExecutor} thread pool. Stage 1 screens candidates,
 *       then <strong>publishes individual messages to the PGMQ
 *       {@code stock_analysis_queue}</strong> instead of processing them
 *       inline. The queue consumer handles Stage 2 independently.</li>
 *   <li>{@link #runFullPipelineSync()} — Synchronous execution for
 *       testing/debug via the {@code GET /scan} endpoint. Processes
 *       candidates inline (does NOT use the queue).</li>
 *   <li>{@link #analyzeSingleTicker(String, String)} — On-demand single
 *       ticker analysis for {@code GET /signal/{symbol}}.</li>
 * </ul>
 */
@Service
public class StockAnalyzerOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(StockAnalyzerOrchestrator.class);
    private static final String ANALYSIS_QUEUE = "stock_analysis_queue";

    private final ScreeningService screeningService;
    private final DeepAnalysisService deepAnalysisService;
    private final QueueService queueService;
    private final ObjectMapper objectMapper;

    public StockAnalyzerOrchestrator(ScreeningService screeningService,
                                      DeepAnalysisService deepAnalysisService,
                                      QueueService queueService,
                                      ObjectMapper objectMapper) {
        this.screeningService = screeningService;
        this.deepAnalysisService = deepAnalysisService;
        this.queueService = queueService;
        this.objectMapper = objectMapper;
    }

    /**
     * Runs Stage 1 (screening) asynchronously, then publishes each
     * candidate ticker as an individual message to the
     * {@code stock_analysis_queue}.
     *
     * <p>This decouples screening from deep analysis: if one stock
     * fails, it doesn't affect the others. The queue consumer
     * ({@code QueueConsumerService}) handles Stage 2 independently,
     * with automatic retries and DLQ escalation.</p>
     */
    @Async("stockAnalyzerExecutor")
    public void runFullPipelineAsync() {
        log.info("========================================");
        log.info("Stock Analyzer async pipeline started");
        log.info("========================================");

        try {
            // Stage 1: Screening
            List<String> candidates = screeningService.screenCandidates();
            log.info("Stage 1 complete: {} candidates screened", candidates.size());

            if (candidates.isEmpty()) {
                log.warn("No candidates found. Nothing to enqueue.");
                return;
            }

            // Stage 1 → Queue hand-off: publish each ticker as an individual message
            int enqueued = 0;
            for (String ticker : candidates) {
                try {
                    StockAnalysisMessage message = new StockAnalysisMessage(ticker, null);
                    String json = objectMapper.writeValueAsString(message);
                    queueService.send(ANALYSIS_QUEUE, json);
                    enqueued++;
                    log.debug("Enqueued {} to {}", ticker, ANALYSIS_QUEUE);
                } catch (JsonProcessingException e) {
                    log.error("Failed to serialize message for {}: {}", ticker, e.getMessage());
                }
            }

            log.info("Pipeline hand-off complete: {}/{} candidates enqueued to '{}'",
                    enqueued, candidates.size(), ANALYSIS_QUEUE);

        } catch (Exception e) {
            log.error("Fatal error in async pipeline: {}", e.getMessage(), e);
        }
    }

    /**
     * Runs the complete two-stage pipeline synchronously (for testing).
     * Processes candidates inline — does NOT use the queue.
     *
     * @return scan result summary
     */
    public ScanResultResponse runFullPipelineSync() {
        log.info("Stock Analyzer sync pipeline started (testing mode)");
        return executePipelineInline(null);
    }

    /**
     * Analyzes a single ticker on-demand (from authenticated user endpoint).
     *
     * @param symbol       the ticker to analyze
     * @param riskAppetite the user's risk appetite profile
     * @return the trading signal, or null on failure
     */
    public TradingSignal analyzeSingleTicker(String symbol, String riskAppetite) {
        log.info("On-demand analysis requested for {} (risk appetite: {})", symbol,
                riskAppetite != null ? riskAppetite : "default");
        return deepAnalysisService.analyzeSymbol(symbol.toUpperCase(), riskAppetite);
    }

    // =========================================================================
    // Inline Pipeline (sync/debug only — not used in production)
    // =========================================================================

    private ScanResultResponse executePipelineInline(String riskAppetite) {
        ScanResultResponse result = new ScanResultResponse();
        result.setStartedAt(LocalDateTime.now());
        List<String> errors = new ArrayList<>();
        int signalsGenerated = 0;

        try {
            // Stage 1: Screening
            List<String> candidates = screeningService.screenCandidates();
            result.setCandidatesScreened(candidates.size());

            // Stage 2: Deep Analysis for each candidate (inline — testing only)
            for (String ticker : candidates) {
                try {
                    TradingSignal signal = deepAnalysisService.analyzeSymbol(ticker, riskAppetite);
                    if (signal != null) {
                        signalsGenerated++;
                    }
                } catch (Exception e) {
                    String error = String.format("Failed to analyze %s: %s", ticker, e.getMessage());
                    errors.add(error);
                    log.error(error);
                }
            }
        } catch (Exception e) {
            String error = "Pipeline execution error: " + e.getMessage();
            errors.add(error);
            log.error(error, e);
        }

        result.setSignalsGenerated(signalsGenerated);
        result.setErrors(errors);
        result.setStatus(errors.isEmpty() ? "COMPLETED" : "COMPLETED_WITH_ERRORS");
        result.setCompletedAt(LocalDateTime.now());

        return result;
    }
}
