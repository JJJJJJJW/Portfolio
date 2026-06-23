package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.config.StockAnalyzerProperties;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client for the Alpha Vantage REST API — used for top movers discovery.
 *
 * <p>Calls the {@code TOP_GAINERS_LOSERS} endpoint which returns the day's
 * top gainers, top losers, and most actively traded US tickers. This endpoint
 * is available on Alpha Vantage's free tier (25 requests/day, 5/min).</p>
 *
 * <p>Rate-limited to 5 calls per minute using Bucket4j, matching the
 * Alpha Vantage free tier limit. The bucket blocks the calling thread when
 * exhausted — safe because the pipeline runs on a dedicated {@code @Async}
 * thread pool.</p>
 *
 * <p>Quality filters applied before returning tickers:</p>
 * <ul>
 *   <li>Price ≥ $1.00 (exclude penny stocks)</li>
 *   <li>Volume ≥ 100,000 (ensure liquidity)</li>
 *   <li>Ticker contains only uppercase letters (exclude warrants like BFRIW, units, rights)</li>
 * </ul>
 */
@Service
public class AlphaVantageService {

    private static final Logger log = LoggerFactory.getLogger(AlphaVantageService.class);

    /** Minimum price to qualify — filters out sub-dollar penny stocks. */
    private static final BigDecimal MIN_PRICE = new BigDecimal("1.00");

    /** Minimum daily volume to qualify — ensures adequate liquidity. */
    private static final long MIN_VOLUME = 100_000L;

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;
    private final Bucket rateLimiter;

    // Cache fields to prevent rate limit issues (25 requests/day standard limit)
    private final Object cacheLock = new Object();
    private List<String> cachedTickers = null;
    private java.time.LocalDateTime cacheExpiry = null;
    private static final Duration CACHE_DURATION = Duration.ofHours(12);

    public AlphaVantageService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();

        // Alpha Vantage free tier: 5 API calls per minute
        this.rateLimiter = Bucket.builder()
                .addLimit(Bandwidth.simple(5, Duration.ofMinutes(1)))
                .build();
    }

    /**
     * Fetches top movers (gainers + losers + most active) from Alpha Vantage.
     *
     * <p>Combines all three categories, applies quality filters, deduplicates,
     * and returns a list of ticker symbols suitable for screening.</p>
     *
     * @return deduplicated list of filtered ticker symbols, or a hardcoded
     *         fallback list if the API call fails
     */
    public List<String> fetchTopMovers() {
        synchronized (cacheLock) {
            if (cachedTickers != null && cacheExpiry != null && java.time.LocalDateTime.now().isBefore(cacheExpiry)) {
                log.info("Returning cached Alpha Vantage top movers (expires at {})", cacheExpiry);
                return cachedTickers;
            }
        }

        consumeToken();

        String url = String.format("%s/query?function=TOP_GAINERS_LOSERS&apikey=%s",
                props.getAlphaVantage().getBaseUrl(),
                props.getAlphaVantage().getApiKey());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                log.warn("Alpha Vantage returned null response for TOP_GAINERS_LOSERS");
                synchronized (cacheLock) {
                    cachedTickers = fallbackTickers();
                    cacheExpiry = java.time.LocalDateTime.now().plus(Duration.ofMinutes(10));
                }
                return cachedTickers;
            }

            // Log any informational messages from Alpha Vantage (rate limit warnings, plan info)
            if (response.containsKey("Information")) {
                log.info("Alpha Vantage info: {}", response.get("Information"));
            }
            if (response.containsKey("Note")) {
                log.info("Alpha Vantage note: {}", response.get("Note"));
            }

            // Try to extract data first — Alpha Vantage may include Info/Note alongside valid data
            List<String> tickers = new ArrayList<>();

            tickers.addAll(extractTickers(response, "top_gainers"));
            tickers.addAll(extractTickers(response, "top_losers"));
            tickers.addAll(extractTickers(response, "most_actively_traded"));

            // Deduplicate
            List<String> deduplicated = tickers.stream().distinct().toList();

            if (!deduplicated.isEmpty()) {
                log.info("Alpha Vantage returned {} unique filtered tickers from TOP_GAINERS_LOSERS",
                        deduplicated.size());
                synchronized (cacheLock) {
                    cachedTickers = deduplicated;
                    cacheExpiry = java.time.LocalDateTime.now().plus(CACHE_DURATION);
                }
                return deduplicated;
            }

            // No usable data — check if this is due to an API-level error
            if (response.containsKey("Information") || response.containsKey("Note")) {
                log.warn("Alpha Vantage returned no data. API message present — likely a plan restriction or rate limit.");
            } else {
                log.warn("Alpha Vantage returned empty data with no error message.");
            }

            synchronized (cacheLock) {
                cachedTickers = fallbackTickers();
                cacheExpiry = java.time.LocalDateTime.now().plus(Duration.ofMinutes(10));
            }
            return cachedTickers;

        } catch (Exception e) {
            log.error("Failed to fetch top movers from Alpha Vantage: {}", e.getMessage());
            synchronized (cacheLock) {
                cachedTickers = fallbackTickers();
                cacheExpiry = java.time.LocalDateTime.now().plus(Duration.ofMinutes(10));
            }
            return cachedTickers;
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Extracts and filters ticker symbols from a specific category in the response.
     *
     * @param response the full API response map
     * @param category the category key (e.g., "top_gainers", "top_losers")
     * @return filtered list of ticker symbols
     */
    @SuppressWarnings("unchecked")
    private List<String> extractTickers(Map<String, Object> response, String category) {
        Object data = response.get(category);
        if (!(data instanceof List)) {
            log.debug("Category '{}' not found or not a list in Alpha Vantage response", category);
            return Collections.emptyList();
        }

        List<Map<String, Object>> entries = (List<Map<String, Object>>) data;
        List<String> result = new ArrayList<>();

        for (Map<String, Object> entry : entries) {
            String ticker = entry.get("ticker") != null ? entry.get("ticker").toString() : null;
            if (ticker == null || ticker.isBlank()) continue;

            // Filter: only plain uppercase-letter tickers (no warrants/units/rights like BFRIW, NVA+)
            if (!ticker.matches("^[A-Z]+$")) {
                log.trace("Filtered out non-standard ticker: {}", ticker);
                continue;
            }

            // Filter: minimum price
            try {
                BigDecimal price = new BigDecimal(entry.get("price").toString());
                if (price.compareTo(MIN_PRICE) < 0) {
                    log.trace("Filtered out penny stock: {} (price={})", ticker, price);
                    continue;
                }
            } catch (Exception e) {
                continue; // Skip if price is missing or unparseable
            }

            // Filter: minimum volume
            try {
                long volume = Long.parseLong(entry.get("volume").toString());
                if (volume < MIN_VOLUME) {
                    log.trace("Filtered out low-volume ticker: {} (volume={})", ticker, volume);
                    continue;
                }
            } catch (Exception e) {
                continue; // Skip if volume is missing or unparseable
            }

            result.add(ticker);
        }

        return result;
    }

    /**
     * Returns a hardcoded fallback list of high-volume US stocks.
     * Used when the Alpha Vantage API is unavailable or returns no usable data.
     */
    private List<String> fallbackTickers() {
        log.warn("Using fallback high-volume ticker list for screening.");
        return List.of(
                "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "AVGO",
                "COST", "JPM", "BAC", "DIS", "XOM", "CVX", "HD", "PG", "JNJ", "LLY"
        );
    }

    /**
     * Acquires a token from the rate limiter, blocking the thread if necessary.
     * Safe because the pipeline runs on a dedicated async thread.
     */
    private void consumeToken() {
        try {
            rateLimiter.asBlocking().consume(1);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Rate limiter interrupted");
        }
    }
}
