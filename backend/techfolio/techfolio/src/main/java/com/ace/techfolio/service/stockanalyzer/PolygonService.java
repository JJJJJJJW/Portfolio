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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client for the Polygon.io REST API (free tier) — OHLCV daily bars only.
 *
 * <p>Rate-limited to 5 calls per minute using Bucket4j. The bucket
 * blocks the calling thread when exhausted — safe because the pipeline
 * runs on a dedicated {@code @Async} thread pool, never on the HTTP
 * request thread.</p>
 *
 * <p>Endpoint used:</p>
 * <ul>
 *   <li>{@code /v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}} — OHLCV bars</li>
 * </ul>
 *
 * <p>Note: Top movers discovery has been moved to {@link AlphaVantageService},
 * which uses Alpha Vantage's free {@code TOP_GAINERS_LOSERS} endpoint.</p>
 */
@Service
public class PolygonService {

    private static final Logger log = LoggerFactory.getLogger(PolygonService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;
    private final Bucket rateLimiter;

    public PolygonService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();

        // Polygon free tier: 5 API calls per minute
        this.rateLimiter = Bucket.builder()
                .addLimit(Bandwidth.simple(5, Duration.ofMinutes(1)))
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
}
