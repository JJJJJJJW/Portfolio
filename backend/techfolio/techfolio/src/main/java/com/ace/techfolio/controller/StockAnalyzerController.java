package com.ace.techfolio.controller;

import com.ace.techfolio.dto.stockanalyzer.ScanResultResponse;
import com.ace.techfolio.dto.stockanalyzer.SignalHistoryResponse;
import com.ace.techfolio.dto.stockanalyzer.TradingSignalResponse;
import com.ace.techfolio.dto.stockanalyzer.WatchlistRequest;
import com.ace.techfolio.dto.stockanalyzer.WatchlistResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;
import com.ace.techfolio.entity.stockanalyzer.Watchlist;
import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.repository.UserRepository;
import com.ace.techfolio.repository.stockanalyzer.TradingSignalRepository;
import com.ace.techfolio.repository.stockanalyzer.WatchlistRepository;
import com.ace.techfolio.service.queue.QueueService;
import com.ace.techfolio.service.stockanalyzer.StockAnalyzerOrchestrator;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST controller for the Stock Analyzer feature.
 *
 * <p>All endpoints require JWT authentication. The user's
 * {@code riskAppetite} from their profile is injected into
 * AI analysis prompts for personalized signals.</p>
 */
@RestController
@RequestMapping("/api/v1/stock-analyzer")
public class StockAnalyzerController {

    private static final Logger log = LoggerFactory.getLogger(StockAnalyzerController.class);

    private final StockAnalyzerOrchestrator orchestrator;
    private final WatchlistRepository watchlistRepo;
    private final TradingSignalRepository signalRepo;
    private final UserRepository userRepo;
    private final StockAnalyzerProperties props;
    private final QueueService queueService;

    public StockAnalyzerController(StockAnalyzerOrchestrator orchestrator,
                                    WatchlistRepository watchlistRepo,
                                    TradingSignalRepository signalRepo,
                                    UserRepository userRepo,
                                    StockAnalyzerProperties props,
                                    QueueService queueService) {
        this.orchestrator = orchestrator;
        this.watchlistRepo = watchlistRepo;
        this.signalRepo = signalRepo;
        this.userRepo = userRepo;
        this.props = props;
        this.queueService = queueService;
    }

    // =========================================================================
    // Signal Analysis
    // =========================================================================

    /**
     * Analyze a single ticker on-demand. Returns cached signal if analyzed today,
     * otherwise runs deep analysis synchronously with user's risk appetite.
     */
    @GetMapping("/signal/{symbol}")
    public ResponseEntity<TradingSignalResponse> analyzeSymbol(
            @PathVariable String symbol,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        String riskAppetite = resolveRiskAppetite(jwt);
        TradingSignal signal = orchestrator.analyzeSingleTicker(symbol.toUpperCase(), riskAppetite);

        if (signal == null) {
            return ResponseEntity.unprocessableEntity().build();
        }

        return ResponseEntity.ok(toResponse(signal));
    }

    /**
     * Run the full pipeline synchronously (for testing/debug).
     */
    @GetMapping("/scan")
    public ResponseEntity<ScanResultResponse> runScan(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        log.info("Manual scan triggered by user {}", jwt.getSubject());
        ScanResultResponse result = orchestrator.runFullPipelineSync();
        return ResponseEntity.ok(result);
    }

    // =========================================================================
    // Watchlist CRUD
    // =========================================================================

    /**
     * Get the current user's watchlist.
     */
    @GetMapping("/watchlist")
    public ResponseEntity<WatchlistResponse> getWatchlist(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        List<Watchlist> entries = watchlistRepo.findAllByUserId(userId);

        List<WatchlistResponse.WatchlistItem> items = entries.stream()
                .map(w -> new WatchlistResponse.WatchlistItem(w.getSymbol(), w.getAddedAt()))
                .toList();

        return ResponseEntity.ok(
                new WatchlistResponse(items, props.getWatchlist().getMaxTickers()));
    }

    /**
     * Add ticker(s) to the user's watchlist.
     */
    @PostMapping("/watchlist")
    public ResponseEntity<Object> addToWatchlist(
            @Valid @RequestBody WatchlistRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        Optional<AppUser> userOpt = userRepo.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "User not found"));
        }

        // Check max limit
        long currentCount = watchlistRepo.countByUserId(userId);
        int maxTickers = props.getWatchlist().getMaxTickers();
        if (currentCount + request.getSymbols().size() > maxTickers) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error",
                            String.format("Watchlist limit exceeded. Current: %d, Max: %d",
                                    currentCount, maxTickers)));
        }

        AppUser user = userOpt.get();
        List<String> added = new ArrayList<>();

        for (String symbol : request.getSymbols()) {
            String normalized = symbol.toUpperCase().trim();
            if (normalized.isBlank()) continue;

            // Skip duplicates
            if (watchlistRepo.findByUserIdAndSymbol(userId, normalized).isPresent()) {
                continue;
            }

            Watchlist entry = new Watchlist();
            entry.setUser(user);
            entry.setSymbol(normalized);
            watchlistRepo.save(entry);
            added.add(normalized);
        }

        return ResponseEntity.ok(Map.of(
                "added", added,
                "count", watchlistRepo.countByUserId(userId)));
    }

    /**
     * Remove a ticker from the user's watchlist.
     */
    @DeleteMapping("/watchlist/{symbol}")
    public ResponseEntity<Map<String, Object>> removeFromWatchlist(
            @PathVariable String symbol,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        Optional<Watchlist> entry = watchlistRepo.findByUserIdAndSymbol(userId, symbol.toUpperCase());

        if (entry.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        watchlistRepo.delete(entry.get());
        return ResponseEntity.ok(Map.of(
                "removed", symbol.toUpperCase(),
                "count", watchlistRepo.countByUserId(userId)));
    }

    // =========================================================================
    // Signal History
    // =========================================================================

    /**
     * Get paginated history of past trading signals.
     */
    @GetMapping("/history")
    public ResponseEntity<SignalHistoryResponse> getSignalHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        Page<TradingSignal> signals = signalRepo.findAllByOrderByAnalyzedAtDesc(
                PageRequest.of(page, Math.min(size, 100)));

        SignalHistoryResponse response = new SignalHistoryResponse();
        response.setSignals(signals.getContent().stream().map(this::toResponse).toList());
        response.setPage(page);
        response.setSize(size);
        response.setTotalElements(signals.getTotalElements());
        response.setTotalPages(signals.getTotalPages());

        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // Queue Monitoring
    // =========================================================================

    /**
     * Returns the current depth of all PGMQ queues.
     * Useful for monitoring pipeline health.
     */
    @GetMapping("/queue-status")
    public ResponseEntity<Map<String, Object>> getQueueStatus(
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        Map<String, Object> status = new LinkedHashMap<>();
        try {
            status.put("stockAnalysisQueue", Map.of(
                    "depth", queueService.getQueueDepth("stock_analysis_queue"),
                    "status", "active"));
            status.put("stockAnalysisFailed", Map.of(
                    "depth", queueService.getQueueDepth("stock_analysis_failed"),
                    "status", "active"));
            status.put("userNotifications", Map.of(
                    "depth", queueService.getQueueDepth("user_notifications"),
                    "status", "active"));
        } catch (Exception e) {
            log.error("Failed to fetch queue status: {}", e.getMessage());
            status.put("error", "Failed to fetch queue depths: " + e.getMessage());
        }

        return ResponseEntity.ok(status);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Resolves the authenticated user's risk appetite from their profile.
     * Returns null if not set (OpenAI prompt will use default behavior).
     */
    private String resolveRiskAppetite(Jwt jwt) {
        try {
            UUID userId = UUID.fromString(jwt.getSubject());
            return userRepo.findById(userId)
                    .map(AppUser::getRiskAppetite)
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Failed to resolve risk appetite: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Converts a TradingSignal entity to the response DTO with disclaimer.
     */
    private TradingSignalResponse toResponse(TradingSignal signal) {
        TradingSignalResponse resp = new TradingSignalResponse();
        resp.setSymbol(signal.getSymbol());
        resp.setSignal(signal.getSignal());
        resp.setConfidence(signal.getConfidence());
        resp.setEntryPrice(signal.getEntryPrice());
        resp.setTargetPrice(signal.getTargetPrice());
        resp.setStopLoss(signal.getStopLoss());
        resp.setRiskRewardRatio(signal.getRiskRewardRatio());
        resp.setReasoning(signal.getReasoning());
        resp.setTimeHorizon(signal.getTimeHorizon());
        resp.setFactors(signal.getFactors());
        resp.setAnalyzedAt(signal.getAnalyzedAt());
        resp.setDataAsOf(signal.getDataAsOf());
        return resp;
    }
}
