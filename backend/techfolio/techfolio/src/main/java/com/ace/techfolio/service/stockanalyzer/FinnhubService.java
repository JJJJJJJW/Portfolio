package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.config.StockAnalyzerProperties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client for the Finnhub API (free tier, 60 calls/min).
 *
 * <p>Used for two purposes in the pipeline:</p>
 * <ul>
 *   <li>Company fundamentals (P/E, EPS growth, revenue growth, debt/equity, sector)</li>
 *   <li>Recent company news headlines + sentiment</li>
 * </ul>
 */
@Service
public class FinnhubService {

    private static final Logger log = LoggerFactory.getLogger(FinnhubService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;

    public FinnhubService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Fetches company profile (sector, market cap, 52-week range) from Finnhub.
     */
    @SuppressWarnings("unchecked")
    public CompanyProfile fetchCompanyProfile(String symbol) {
        String url = String.format("%s/stock/profile2?symbol=%s&token=%s",
                props.getFinnhub().getBaseUrl(), symbol.toUpperCase(), props.getFinnhub().getApiKey());

        try {
            Map<String, Object> data = restTemplate.getForObject(url, Map.class);
            if (data == null || data.isEmpty()) {
                log.warn("Empty profile response for {}", symbol);
                return new CompanyProfile();
            }

            CompanyProfile profile = new CompanyProfile();
            profile.setSector(getStr(data, "finnhubIndustry"));
            profile.setMarketCap(toLong(data.get("marketCapitalization")));
            return profile;
        } catch (Exception e) {
            log.error("Failed to fetch company profile for {}: {}", symbol, e.getMessage());
            return new CompanyProfile();
        }
    }

    /**
     * Fetches basic financials (P/E, 52-week high/low, avg volume) from Finnhub.
     */
    @SuppressWarnings("unchecked")
    public BasicFinancials fetchBasicFinancials(String symbol) {
        String url = String.format("%s/stock/metric?symbol=%s&metric=all&token=%s",
                props.getFinnhub().getBaseUrl(), symbol.toUpperCase(), props.getFinnhub().getApiKey());

        try {
            Map<String, Object> data = restTemplate.getForObject(url, Map.class);
            if (data == null) {
                return new BasicFinancials();
            }

            Map<String, Object> metric = (Map<String, Object>) data.get("metric");
            if (metric == null) {
                return new BasicFinancials();
            }

            BasicFinancials fin = new BasicFinancials();
            fin.setPeRatio(toDouble(metric.get("peNormalizedAnnual")));
            fin.setEpsGrowthYoY(toDouble(metric.get("epsGrowthTTMYoy")));
            fin.setRevenueGrowthYoY(toDouble(metric.get("revenueGrowthTTMYoy")));
            fin.setDebtToEquity(toDouble(metric.get("totalDebt/totalEquityAnnual")));
            fin.setHigh52Week(toBigDecimal(metric.get("52WeekHigh")));
            fin.setLow52Week(toBigDecimal(metric.get("52WeekLow")));
            fin.setAvgVolume(toLong(metric.get("10DayAverageTradingVolume")));
            return fin;
        } catch (Exception e) {
            log.error("Failed to fetch financials for {}: {}", symbol, e.getMessage());
            return new BasicFinancials();
        }
    }

    /**
     * Fetches recent company news headlines from Finnhub.
     *
     * @param symbol   the ticker
     * @param daysBack how many days of news to fetch
     * @return list of headline summaries
     */
    @SuppressWarnings("unchecked")
    public List<String> fetchCompanyNews(String symbol, int daysBack) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(daysBack);

        String url = String.format("%s/company-news?symbol=%s&from=%s&to=%s&token=%s",
                props.getFinnhub().getBaseUrl(),
                symbol.toUpperCase(),
                from.format(DATE_FMT),
                to.format(DATE_FMT),
                props.getFinnhub().getApiKey());

        try {
            List<Map<String, Object>> articles = restTemplate.getForObject(url, List.class);
            if (articles == null || articles.isEmpty()) {
                return Collections.singletonList("No recent news available.");
            }

            // Take up to 5 headlines
            List<String> headlines = new ArrayList<>();
            int limit = Math.min(articles.size(), 5);
            for (int i = 0; i < limit; i++) {
                String headline = getStr(articles.get(i), "headline");
                String summary = getStr(articles.get(i), "summary");
                if (headline != null) {
                    String entry = headline;
                    if (summary != null && !summary.isBlank() && summary.length() < 200) {
                        entry += " — " + summary;
                    }
                    headlines.add(entry);
                }
            }
            return headlines.isEmpty() ? Collections.singletonList("No recent news available.") : headlines;
        } catch (Exception e) {
            log.error("Failed to fetch news for {}: {}", symbol, e.getMessage());
            return Collections.singletonList("News data unavailable.");
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String getStr(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private Double toDouble(Object value) {
        if (value == null) return null;
        return ((Number) value).doubleValue();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        return new BigDecimal(value.toString());
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        // Finnhub may return volume in millions
        return ((Number) value).longValue();
    }

    // =========================================================================
    // Response DTOs
    // =========================================================================

    public static class CompanyProfile {
        private String sector;
        private Long marketCap;

        public String getSector() { return sector; }
        public void setSector(String sector) { this.sector = sector; }
        public Long getMarketCap() { return marketCap; }
        public void setMarketCap(Long marketCap) { this.marketCap = marketCap; }
    }

    public static class BasicFinancials {
        private Double peRatio;
        private Double epsGrowthYoY;
        private Double revenueGrowthYoY;
        private Double debtToEquity;
        private BigDecimal high52Week;
        private BigDecimal low52Week;
        private Long avgVolume;

        public Double getPeRatio() { return peRatio; }
        public void setPeRatio(Double peRatio) { this.peRatio = peRatio; }
        public Double getEpsGrowthYoY() { return epsGrowthYoY; }
        public void setEpsGrowthYoY(Double epsGrowthYoY) { this.epsGrowthYoY = epsGrowthYoY; }
        public Double getRevenueGrowthYoY() { return revenueGrowthYoY; }
        public void setRevenueGrowthYoY(Double revenueGrowthYoY) { this.revenueGrowthYoY = revenueGrowthYoY; }
        public Double getDebtToEquity() { return debtToEquity; }
        public void setDebtToEquity(Double debtToEquity) { this.debtToEquity = debtToEquity; }
        public BigDecimal getHigh52Week() { return high52Week; }
        public void setHigh52Week(BigDecimal high52Week) { this.high52Week = high52Week; }
        public BigDecimal getLow52Week() { return low52Week; }
        public void setLow52Week(BigDecimal low52Week) { this.low52Week = low52Week; }
        public Long getAvgVolume() { return avgVolume; }
        public void setAvgVolume(Long avgVolume) { this.avgVolume = avgVolume; }
    }
}
