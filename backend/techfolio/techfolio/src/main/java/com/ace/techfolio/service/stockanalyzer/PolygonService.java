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
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client for the Polygon.io REST API (free tier) — OHLCV daily bars and top movers discovery.
 *
 * <p>Rate-limited to 5 calls per minute using Bucket4j. The bucket
 * blocks the calling thread when exhausted — safe because the pipeline
 * runs on a dedicated {@code @Async} thread pool, never on the HTTP
 * request thread.</p>
 *
 * <p>Endpoints used:</p>
 * <ul>
 *   <li>{@code /v2/aggs/grouped/locale/us/market/stocks/{date}} — Grouped Daily bars</li>
 *   <li>{@code /v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}} — OHLCV bars</li>
 * </ul>
 */
@Service
public class PolygonService {

    private static final Logger log = LoggerFactory.getLogger(PolygonService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;
    private final Bucket rateLimiter;

    // Cache fields to prevent rate limit issues (Polygon free tier: 5 requests/minute)
    private final Object cacheLock = new Object();
    private List<String> cachedTickers = null;
    private LocalDateTime cacheExpiry = null;
    private static final Duration CACHE_DURATION = Duration.ofHours(12);

    public PolygonService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();

        // Spaced out rate limiting (1 call per 12 seconds) to avoid sliding 60s window 429 errors
        this.rateLimiter = Bucket.builder()
                .addLimit(Bandwidth.simple(1, Duration.ofSeconds(12)))
                .build();
    }

    /**
     * Fetches daily OHLCV bars for a symbol over the specified number of days.
     *
     * @param symbol the ticker symbol (e.g., "AAPL")
     * @param days   number of calendar days to look back
     * @return list of OHLCV bar data maps, or empty list on failure
     */
    public List<OhlcvBar> fetchDailyBars(String symbol, int days) {
        consumeToken();

        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(days);

        String url = String.format("%s/v2/aggs/ticker/%s/range/1/day/%s/%s?adjusted=true&sort=asc&apiKey=%s",
                props.getPolygon().getBaseUrl(),
                symbol.toUpperCase(),
                from.format(DATE_FMT),
                to.format(DATE_FMT),
                props.getPolygon().getApiKey());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                log.warn("Polygon returned null response for {}", symbol);
                return Collections.emptyList();
            }

            String status = response.get("status") != null ? response.get("status").toString() : "null";
            // Polygon basic plan returns "DELAYED" instead of "OK" for aggregates
            if (!"OK".equals(status) && !"DELAYED".equals(status)) {
                log.warn("Polygon returned non-OK/DELAYED for {}: {}", symbol, status);
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            if (results == null) {
                return Collections.emptyList();
            }

            return results.stream().map(r -> {
                OhlcvBar bar = new OhlcvBar();
                bar.setOpen(toBigDecimal(r.get("o")));
                bar.setHigh(toBigDecimal(r.get("h")));
                bar.setLow(toBigDecimal(r.get("l")));
                bar.setClose(toBigDecimal(r.get("c")));
                bar.setVolume(toLong(r.get("v")));
                bar.setDate(toLocalDate(r.get("t")));
                return bar;
            }).toList();

        } catch (Exception e) {
            log.error("Failed to fetch daily bars for {} from Polygon: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetches top movers (gainers + losers + most active) from Polygon Grouped Daily endpoint.
     *
     * <p>Combines all three categories, applies quality filters, deduplicates,
     * and returns a list of ticker symbols suitable for screening.</p>
     *
     * @return deduplicated list of filtered ticker symbols, or a hardcoded
     *         fallback list if the API call fails
     */
    public List<String> fetchTopMovers() {
        synchronized (cacheLock) {
            if (cachedTickers != null && cacheExpiry != null && LocalDateTime.now().isBefore(cacheExpiry)) {
                log.info("Returning cached Polygon top movers (expires at {})", cacheExpiry);
                return cachedTickers;
            }
        }

        // Determine target date (using US stock market Eastern Time / America/New_York)
        ZonedDateTime nyTime = ZonedDateTime.now(ZoneId.of("America/New_York"));
        LocalDate targetDate = nyTime.toLocalDate();
        LocalTime marketClosePlus = LocalTime.of(18, 0); // 6:00 PM NY time

        // If today is weekend, or weekday before 6 PM NY time, query the previous business day.
        if (targetDate.getDayOfWeek() == java.time.DayOfWeek.SATURDAY) {
            targetDate = targetDate.minusDays(1);
        } else if (targetDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            targetDate = targetDate.minusDays(2);
        } else if (nyTime.toLocalTime().isBefore(marketClosePlus)) {
            if (targetDate.getDayOfWeek() == java.time.DayOfWeek.MONDAY) {
                targetDate = targetDate.minusDays(3);
            } else {
                targetDate = targetDate.minusDays(1);
            }
        }

        List<GroupedBar> allBars = null;
        LocalDate queryDate = targetDate;
        int attempts = 0;

        // Loop backwards through business days (up to 3 attempts max to bridge holidays)
        while (attempts < 3) {
            allBars = fetchGroupedDaily(queryDate);
            if (allBars != null && !allBars.isEmpty()) {
                log.info("Successfully fetched {} grouped daily bars for date {}", allBars.size(), queryDate);
                break;
            }
            log.warn("No grouped daily data for {}. Trying previous business day.", queryDate);
            queryDate = getPreviousBusinessDay(queryDate);
            attempts++;
        }

        if (allBars == null || allBars.isEmpty()) {
            log.warn("Failed to fetch grouped daily data from Polygon after 3 attempts. Using fallback.");
            synchronized (cacheLock) {
                cachedTickers = fallbackTickers();
                cacheExpiry = LocalDateTime.now().plus(Duration.ofMinutes(10));
            }
            return cachedTickers;
        }

        // Apply quality filters and compute change percentages in-memory
        List<TickerChange> filtered = new ArrayList<>();
        for (GroupedBar bar : allBars) {
            String ticker = bar.getTicker();
            if (ticker == null || ticker.isBlank()) continue;

            // Only plain uppercase-letter tickers (exclude warrants, units, rights)
            if (!ticker.matches("^[A-Z]+$")) continue;

            // Price filter: >= $1.00 (exclude penny stocks)
            BigDecimal close = bar.getClose();
            if (close == null || close.compareTo(new BigDecimal("1.00")) < 0) continue;

            // Volume filter: >= 100,000 (ensure liquidity)
            Long volume = bar.getVolume();
            if (volume == null || volume < 100_000L) continue;

            // Check for valid open price to compute percentage change
            BigDecimal open = bar.getOpen();
            if (open == null || open.compareTo(BigDecimal.ZERO) <= 0) continue;

            double pctChange = close.subtract(open)
                    .divide(open, 6, java.math.RoundingMode.HALF_UP)
                    .doubleValue() * 100.0;

            TickerChange tc = new TickerChange();
            tc.ticker = ticker;
            tc.percentChange = pctChange;
            tc.volume = volume;
            filtered.add(tc);
        }

        if (filtered.isEmpty()) {
            log.warn("No tickers passed the quality filters. Using fallback list.");
            synchronized (cacheLock) {
                cachedTickers = fallbackTickers();
                cacheExpiry = LocalDateTime.now().plus(Duration.ofMinutes(10));
            }
            return cachedTickers;
        }

        // Sort to get top 20 gainers, top 20 losers, and top 20 most active
        List<String> gainers = filtered.stream()
                .sorted((a, b) -> Double.compare(b.percentChange, a.percentChange))
                .limit(20)
                .map(tc -> tc.ticker)
                .toList();

        List<String> losers = filtered.stream()
                .sorted((a, b) -> Double.compare(a.percentChange, b.percentChange))
                .limit(20)
                .map(tc -> tc.ticker)
                .toList();

        List<String> mostActive = filtered.stream()
                .sorted((a, b) -> Long.compare(b.volume, a.volume))
                .limit(20)
                .map(tc -> tc.ticker)
                .toList();

        List<String> combined = new ArrayList<>();
        combined.addAll(gainers);
        combined.addAll(losers);
        combined.addAll(mostActive);

        List<String> deduplicated = combined.stream().distinct().toList();
        log.info("Extracted {} unique tickers from Polygon Grouped Daily (gainers={}, losers={}, active={})",
                deduplicated.size(), gainers.size(), losers.size(), mostActive.size());

        synchronized (cacheLock) {
            cachedTickers = deduplicated;
            cacheExpiry = LocalDateTime.now().plus(CACHE_DURATION);
        }
        return deduplicated;
    }

    /**
     * Fetches grouped daily bars for all tickers for a specific date.
     *
     * @param date the target date
     * @return list of GroupedBar objects, or empty list on failure
     */
    public List<GroupedBar> fetchGroupedDaily(LocalDate date) {
        consumeToken();

        String url = String.format("%s/v2/aggs/grouped/locale/us/market/stocks/%s?adjusted=true&apiKey=%s",
                props.getPolygon().getBaseUrl(),
                date.format(DATE_FMT),
                props.getPolygon().getApiKey());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                log.warn("Polygon returned null response for grouped daily on {}", date);
                return Collections.emptyList();
            }

            String status = response.get("status") != null ? response.get("status").toString() : "null";
            if (!"OK".equals(status) && !"DELAYED".equals(status)) {
                log.warn("Polygon returned non-OK/DELAYED status for grouped daily on {}: {}", date, status);
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            if (results == null) {
                return Collections.emptyList();
            }

            return results.stream().map(r -> {
                GroupedBar bar = new GroupedBar();
                bar.setTicker(r.get("T") != null ? r.get("T").toString() : null);
                bar.setOpen(toBigDecimal(r.get("o")));
                bar.setHigh(toBigDecimal(r.get("h")));
                bar.setLow(toBigDecimal(r.get("l")));
                bar.setClose(toBigDecimal(r.get("c")));
                bar.setVolume(toLong(r.get("v")));
                return bar;
            }).toList();

        } catch (Exception e) {
            log.error("Failed to fetch grouped daily for {} from Polygon: {}", date, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Helper to retrieve the previous business day (skips Saturday and Sunday).
     */
    private LocalDate getPreviousBusinessDay(LocalDate date) {
        LocalDate prev = date.minusDays(1);
        while (prev.getDayOfWeek() == java.time.DayOfWeek.SATURDAY || prev.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            prev = prev.minusDays(1);
        }
        return prev;
    }

    /**
     * Returns a hardcoded fallback list of high-volume US stocks.
     * Used when the Polygon API is unavailable or returns no usable data.
     */
    private List<String> fallbackTickers() {
        log.warn("Using fallback high-volume ticker list for screening.");
        return List.of(
                "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "AVGO",
                "COST", "JPM", "BAC", "DIS", "XOM", "CVX", "HD", "PG", "JNJ", "LLY"
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

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

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        return new BigDecimal(value.toString());
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        return ((Number) value).longValue();
    }

    private LocalDate toLocalDate(Object timestampMs) {
        if (timestampMs == null) return null;
        long millis = ((Number) timestampMs).longValue();
        return Instant.ofEpochMilli(millis).atZone(ZoneId.of("America/New_York")).toLocalDate();
    }

    // =========================================================================
    // OHLCV Bar DTO
    // =========================================================================

    /**
     * Simple POJO for a single OHLCV bar from Polygon.
     */
    public static class OhlcvBar {
        private LocalDate date;
        private BigDecimal open;
        private BigDecimal high;
        private BigDecimal low;
        private BigDecimal close;
        private Long volume;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }
        public BigDecimal getOpen() { return open; }
        public void setOpen(BigDecimal open) { this.open = open; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getClose() { return close; }
        public void setClose(BigDecimal close) { this.close = close; }
        public Long getVolume() { return volume; }
        public void setVolume(Long volume) { this.volume = volume; }
    }

    // =========================================================================
    // DTOs & Inner Classes
    // =========================================================================

    /**
     * Simple POJO for a single Grouped Daily bar from Polygon.
     */
    public static class GroupedBar {
        private String ticker;
        private BigDecimal open;
        private BigDecimal high;
        private BigDecimal low;
        private BigDecimal close;
        private Long volume;

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }
        public BigDecimal getOpen() { return open; }
        public void setOpen(BigDecimal open) { this.open = open; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getClose() { return close; }
        public void setClose(BigDecimal close) { this.close = close; }
        public Long getVolume() { return volume; }
        public void setVolume(Long volume) { this.volume = volume; }
    }

    private static class TickerChange {
        String ticker;
        double percentChange;
        long volume;
    }
}
