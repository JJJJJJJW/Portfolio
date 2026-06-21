package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.entity.stockanalyzer.MacroSnapshot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Client for the FRED API (Federal Reserve Economic Data).
 *
 * <p>Fetches macroeconomic indicators used in the AI prompt context:</p>
 * <ul>
 *   <li>DFF — Effective Federal Funds Rate</li>
 *   <li>DGS10 — 10-Year Treasury Constant Maturity Rate</li>
 *   <li>CPIAUCSL — Consumer Price Index (for YoY calculation)</li>
 *   <li>VIXCLS — CBOE Volatility Index</li>
 * </ul>
 *
 * <p>Rate limit: 120 calls/min (free tier). No throttling needed given
 * the pipeline's sequential nature (4-5 calls per run).</p>
 */
@Service
public class FredService {

    private static final Logger log = LoggerFactory.getLogger(FredService.class);

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;

    public FredService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Builds a complete {@link MacroSnapshot} from multiple FRED series.
     */
    public MacroSnapshot fetchMacroSnapshot() {
        MacroSnapshot snapshot = new MacroSnapshot();
        snapshot.setDate(LocalDate.now());

        snapshot.setFedFundsRate(fetchLatestValue("DFF"));
        snapshot.setTreasury10Y(fetchLatestValue("DGS10"));
        snapshot.setVix(fetchLatestValue("VIXCLS"));

        // CPI YoY requires comparing current vs. 12 months ago
        snapshot.setCpiYoY(calculateCpiYoY());

        // SPY vs 200-SMA: we'll approximate using FRED's S&P 500 index
        snapshot.setSpyVs200SMA(calculateSpyTrend());

        return snapshot;
    }

    /**
     * Fetches the latest observation for a FRED series.
     *
     * @param seriesId the FRED series identifier
     * @return the latest numeric value, or null if unavailable
     */
    @SuppressWarnings("unchecked")
    public Double fetchLatestValue(String seriesId) {
        String url = String.format(
                "%s/series/observations?series_id=%s&sort_order=desc&limit=1&file_type=json&api_key=%s",
                props.getFred().getBaseUrl(), seriesId, props.getFred().getApiKey());

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return null;

            List<Map<String, Object>> observations = (List<Map<String, Object>>) response.get("observations");
            if (observations == null || observations.isEmpty()) return null;

            String value = observations.get(0).get("value").toString();
            if (".".equals(value) || value.isBlank()) return null;

            return Double.parseDouble(value);
        } catch (Exception e) {
            log.error("Failed to fetch FRED series {}: {}", seriesId, e.getMessage());
            return null;
        }
    }

    // =========================================================================
    // CPI Year-over-Year Calculation
    // =========================================================================

    @SuppressWarnings("unchecked")
    private Double calculateCpiYoY() {
        String url = String.format(
                "%s/series/observations?series_id=CPIAUCSL&sort_order=desc&limit=13&file_type=json&api_key=%s",
                props.getFred().getBaseUrl(), props.getFred().getApiKey());

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return null;

            List<Map<String, Object>> observations = (List<Map<String, Object>>) response.get("observations");
            if (observations == null || observations.size() < 13) return null;

            // observations[0] is most recent, observations[12] is ~12 months ago
            double current = Double.parseDouble(observations.get(0).get("value").toString());
            double yearAgo = Double.parseDouble(observations.get(12).get("value").toString());

            return Math.round(((current - yearAgo) / yearAgo) * 10000.0) / 100.0; // e.g., 3.25%
        } catch (Exception e) {
            log.error("Failed to calculate CPI YoY: {}", e.getMessage());
            return null;
        }
    }

    // =========================================================================
    // S&P 500 vs 200-SMA Trend
    // =========================================================================

    @SuppressWarnings("unchecked")
    private String calculateSpyTrend() {
        // Use SP500 daily index from FRED
        String url = String.format(
                "%s/series/observations?series_id=SP500&sort_order=desc&limit=220&file_type=json&api_key=%s",
                props.getFred().getBaseUrl(), props.getFred().getApiKey());

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return "UNKNOWN";

            List<Map<String, Object>> observations = (List<Map<String, Object>>) response.get("observations");
            if (observations == null || observations.size() < 200) return "UNKNOWN";

            // Latest value
            double latest = parseObservation(observations.get(0));
            if (latest <= 0) return "UNKNOWN";

            // Calculate 200-day SMA
            double sum = 0;
            int count = 0;
            for (int i = 0; i < 200 && i < observations.size(); i++) {
                double val = parseObservation(observations.get(i));
                if (val > 0) {
                    sum += val;
                    count++;
                }
            }

            if (count < 150) return "UNKNOWN"; // Not enough data

            double sma200 = sum / count;
            return latest > sma200 ? "ABOVE" : "BELOW";
        } catch (Exception e) {
            log.error("Failed to calculate SPY trend: {}", e.getMessage());
            return "UNKNOWN";
        }
    }

    private double parseObservation(Map<String, Object> obs) {
        try {
            String val = obs.get("value").toString();
            if (".".equals(val) || val.isBlank()) return -1;
            return Double.parseDouble(val);
        } catch (Exception e) {
            return -1;
        }
    }
}
