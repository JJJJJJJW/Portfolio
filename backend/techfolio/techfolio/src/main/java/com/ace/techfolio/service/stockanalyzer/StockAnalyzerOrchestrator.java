package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.dto.stockanalyzer.ScanResultResponse;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;

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
 * <p>Provides two execution modes:</p>
 * <ul>
 *   <li>{@link #runFullPipelineAsync()} — Asynchronous execution on the
 *       {@code stockAnalyzerExecutor} thread pool. Called by the internal
 *       cron trigger endpoint. Returns void (fire-and-forget).</li>
 *   <li>{@link #runFullPipelineSync()} — Synchronous execution for
 *       testing/debug via the {@code GET /scan} endpoint.</li>
 *   <li>{@link #analyzeSingleTicker(String, String)} — On-demand single
 *       ticker analysis for {@code GET /signal/{symbol}}.</li>
 * </ul>
 */
@Service
public class StockAnalyzerOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(StockAnalyzerOrchestrator.class);

    private final ScreeningService screeningService;
    private final DeepAnalysisService deepAnalysisService;

    public StockAnalyzerOrchestrator(ScreeningService screeningService,
                                      DeepAnalysisService deepAnalysisService) {
        this.screeningService = screeningService;
        this.deepAnalysisService = deepAnalysisService;
    }

    /**
     * Runs the complete two-stage pipeline asynchronously.
     *
     * <p>This method is annotated with {@code @Async} so it runs on the
     * dedicated {@code stockAnalyzerExecutor} thread pool, never blocking
     * the HTTP request thread. The cron endpoint returns 202 immediately.</p>
     */
    @Async("stockAnalyzerExecutor")
    public void runFullPipelineAsync() {
        log.info("========================================");
        log.info("Stock Analyzer async pipeline started");
        log.info("========================================");

        try {
            ScanResultResponse result = executePipeline(null);
            log.info("Async pipeline completed: {} signals generated, {} errors",
                    result.getSignalsGenerated(), result.getErrors().size());
        } catch (Exception e) {
            log.error("Fatal error in async pipeline: {}", e.getMessage(), e);
        }
    }

    /**
     * Runs the complete two-stage pipeline synchronously (for testing).
     *
     * @return scan result summary
     */
    public ScanResultResponse runFullPipelineSync() {
        log.info("Stock Analyzer sync pipeline started (testing mode)");
        return executePipeline(null);
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
    // Pipeline Execution
    // =========================================================================

    private ScanResultResponse executePipeline(String riskAppetite) {
        ScanResultResponse result = new ScanResultResponse();
        result.setStartedAt(LocalDateTime.now());
        List<String> errors = new ArrayList<>();
        int signalsGenerated = 0;

        try {
            // Stage 1: Screening
            List<String> candidates = screeningService.screenCandidates();
            result.setCandidatesScreened(candidates.size());

            // Stage 2: Deep Analysis for each candidate
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
