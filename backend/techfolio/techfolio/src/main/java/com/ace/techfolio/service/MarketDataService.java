package com.ace.techfolio.service;

import com.ace.techfolio.dto.MarketSearchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import yahoofinance.Stock;
import yahoofinance.YahooFinance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Unified Market Data Router.
 *
 * <p>Routes asset search and price requests to the correct upstream provider:</p>
 * <ul>
 *   <li><b>Bursa Malaysia (.KL)</b>: Yahoo Finance API via {@code com.yahoofinance-api}</li>
 *   <li><b>US Equities, Forex, Crypto</b>: Twelve Data REST API via {@link TwelveDataService}</li>
 * </ul>
 *
 * <p>All objects from external libraries (e.g., Yahoo's {@code Stock}) are used within
 * local method scope only, so the Serial GC can reclaim them immediately.</p>
 */
@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    static {
        // Configure the Java-wide default User-Agent to mimic a browser.
        // This acts as a first line of defense for libraries like yahoofinance-api
        // that use standard URLConnections without setting a custom User-Agent.
        System.setProperty("http.agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    }

    private final TwelveDataService twelveDataService;

    /**
     * Lightweight in-memory lookup of popular Bursa Malaysia tickers.
     * Key = numeric stock code, Value = company name.
     * This avoids an API call for Malaysian stock search.
     */
    private static final Map<String, String> BURSA_TICKERS = Map.ofEntries(
            Map.entry("1015", "AMMB Holdings"),
            Map.entry("1023", "CIMB Group"),
            Map.entry("1066", "RHB Bank"),
            Map.entry("1155", "Malayan Banking (Maybank)"),
            Map.entry("1171", "Sunway Berhad"),
            Map.entry("1295", "Public Bank"),
            Map.entry("1818", "Bursa Malaysia"),
            Map.entry("2445", "Kuala Lumpur Kepong"),
            Map.entry("3816", "MISC Berhad"),
            Map.entry("3182", "Genting Berhad"),
            Map.entry("4065", "PPB Group"),
            Map.entry("4197", "Sime Darby"),
            Map.entry("4707", "Nestle Malaysia"),
            Map.entry("4715", "Genting Malaysia"),
            Map.entry("4863", "Telekom Malaysia"),
            Map.entry("5183", "Petronas Chemicals"),
            Map.entry("5225", "IHH Healthcare"),
            Map.entry("5235", "Axiata Group"),
            Map.entry("5296", "QL Resources"),
            Map.entry("5347", "Tenaga Nasional"),
            Map.entry("5681", "Petronas Dagangan"),
            Map.entry("6012", "Maxis Berhad"),
            Map.entry("6033", "Petronas Gas"),
            Map.entry("6742", "YTL Power"),
            Map.entry("6888", "Dialog Group"),
            Map.entry("6947", "Digi.Com (CelcomDigi)"),
            Map.entry("7052", "Hartalega Holdings"),
            Map.entry("7084", "QL Resources"),
            Map.entry("7113", "Top Glove"),
            Map.entry("0166", "MYEG Services"),
            Map.entry("5099", "AirAsia (Capital A)")
    );

    public MarketDataService(TwelveDataService twelveDataService) {
        this.twelveDataService = twelveDataService;
    }

    // =========================================================================
    // SEARCH (Autocomplete Router)
    // =========================================================================

    /**
     * Intelligent search router.
     * <ul>
     *   <li>If the query is purely numeric or ends with ".KL" → Bursa Malaysia local lookup.</li>
     *   <li>Otherwise → forward to Twelve Data /symbol_search.</li>
     * </ul>
     */
    public List<MarketSearchResult> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        String trimmed = query.trim();

        // Route to Bursa if query is purely numeric or ends with .KL
        if (trimmed.matches("^\\d+$") || trimmed.toUpperCase().endsWith(".KL")) {
            return searchBursa(trimmed);
        }

        // Otherwise → Twelve Data global search
        return searchTwelveData(trimmed);
    }

    /**
     * Searches the in-memory Bursa ticker map by code or company name substring.
     */
    private List<MarketSearchResult> searchBursa(String query) {
        List<MarketSearchResult> results = new ArrayList<>();
        String upperQuery = query.toUpperCase().replace(".KL", "");

        for (Map.Entry<String, String> entry : BURSA_TICKERS.entrySet()) {
            String code = entry.getKey();
            String name = entry.getValue();

            if (code.contains(upperQuery) || name.toUpperCase().contains(upperQuery)) {
                results.add(new MarketSearchResult(
                        code + ".KL",
                        name,
                        "Common Stock",
                        "Bursa Malaysia (XKLS)"
                ));
            }
        }

        log.info("Bursa search for '{}' returned {} results", query, results.size());
        return results;
    }

    /**
     * Forwards the search query to Twelve Data's /symbol_search and maps results to DTOs.
     */
    private List<MarketSearchResult> searchTwelveData(String query) {
        List<Map<String, String>> rawResults = twelveDataService.searchSymbols(query);
        List<MarketSearchResult> results = new ArrayList<>();

        for (Map<String, String> raw : rawResults) {
            results.add(new MarketSearchResult(
                    raw.getOrDefault("symbol", ""),
                    raw.getOrDefault("name", ""),
                    raw.getOrDefault("type", ""),
                    raw.getOrDefault("exchange", "")
            ));
        }

        log.info("Twelve Data search for '{}' returned {} results", query, results.size());
        return results;
    }

    // =========================================================================
    // BATCH PRICING (Concurrent Dual-Provider Router)
    // =========================================================================

    /**
     * Accepts a list of tickers, separates Bursa (.KL) from global tickers,
     * fetches prices from the correct provider in two efficient bulk calls,
     * and merges results into a single flat map.
     *
     * @param tickers list of ticker strings, e.g. ["1155.KL", "AAPL", "BTC/USD"]
     * @return map of Ticker → Current Price (fallback 0.0 on error)
     */
    public Map<String, Double> getBatchPrices(List<String> tickers) {
        if (tickers == null || tickers.isEmpty()) {
            return Map.of();
        }

        // Partition tickers into Bursa (.KL) and Twelve Data (everything else)
        List<String> bursaTickers = new ArrayList<>();
        List<String> globalTickers = new ArrayList<>();

        for (String ticker : tickers) {
            if (ticker == null || ticker.isBlank()) continue;
            String cleaned = ticker.trim().toUpperCase();
            if (cleaned.endsWith(".KL")) {
                bursaTickers.add(cleaned);
            } else {
                globalTickers.add(cleaned);
            }
        }

        Map<String, Double> combined = new HashMap<>();

        // Bulk call 1: Yahoo Finance for Bursa Malaysia
        if (!bursaTickers.isEmpty()) {
            Map<String, Double> bursaPrices = fetchBursaPrices(bursaTickers);
            combined.putAll(bursaPrices);
        }

        // Bulk call 2: Twelve Data for global assets
        if (!globalTickers.isEmpty()) {
            Map<String, Double> globalPrices = twelveDataService.getPrices(globalTickers);
            combined.putAll(globalPrices);
        }

        return combined;
    }

    /**
     * Fetches prices for Bursa Malaysia stocks via Yahoo Finance batch API.
     * Extracts primitive values immediately and lets Stock objects go out of scope for GC.
     *
     * @param symbols list of ".KL" suffixed tickers
     * @return map of symbol → price (fallback 0.0 for failures)
     */
    private Map<String, Double> fetchBursaPrices(List<String> symbols) {
        Map<String, Double> result = new HashMap<>();

        try {
            String[] symbolArray = symbols.toArray(new String[0]);
            log.info("Fetching Bursa prices via Yahoo Finance library for: {}", symbols);

            // Yahoo Finance batch call — returns Map<String, Stock>
            Map<String, Stock> stocks = YahooFinance.get(symbolArray);

            for (Map.Entry<String, Stock> entry : stocks.entrySet()) {
                String sym = entry.getKey().toUpperCase();
                Stock stock = entry.getValue();

                try {
                    if (stock != null
                            && stock.getQuote() != null
                            && stock.getQuote().getPrice() != null) {
                        BigDecimal price = stock.getQuote().getPrice();
                        result.put(sym, price.doubleValue());
                    } else {
                        log.warn("Yahoo Finance library returned null/invalid quote for Bursa ticker: {}", sym);
                        result.put(sym, 0.0);
                    }
                } catch (Exception e) {
                    log.error("Error extracting Yahoo Finance library price for {}: {}", sym, e.getMessage());
                    result.put(sym, 0.0);
                }
            }
        } catch (Exception e) {
            log.warn("Yahoo Finance library batch call failed ({}). Attempting direct REST fallback...", e.getMessage());
            result = fetchBursaPricesDirect(symbols);
        }

        // Ensure all requested symbols have a value
        for (String sym : symbols) {
            result.putIfAbsent(sym.toUpperCase(), 0.0);
        }

        return result;
    }

    /**
     * Fallback mechanism: queries Yahoo Finance v8 chart JSON endpoint directly.
     * The v7 quote API requires crumb authentication, but v8 chart API is often open.
     * Reuses standard RestTemplate and explicitly sends browser User-Agent headers.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Double> fetchBursaPricesDirect(List<String> symbols) {
        Map<String, Double> prices = new HashMap<>();
        if (symbols == null || symbols.isEmpty()) return prices;

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        org.springframework.boot.json.JsonParser parser = org.springframework.boot.json.JsonParserFactory.getJsonParser();

        for (String symbol : symbols) {
            if (symbol == null || symbol.isBlank()) continue;
            String cleanSymbol = symbol.trim().toUpperCase();
            
            try {
                String url = UriComponentsBuilder.fromUriString("https://query1.finance.yahoo.com/v8/finance/chart/" + cleanSymbol)
                        .build()
                        .toUriString();

                log.info("Fetching Bursa price fallback directly from Yahoo v8 chart API: {}", url);

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                String responseBody = response.getBody();

                if (responseBody != null && !responseBody.isBlank()) {
                    Map<String, Object> root = parser.parseMap(responseBody);
                    if (root.containsKey("chart")) {
                        Map<String, Object> chart = (Map<String, Object>) root.get("chart");
                        if (chart != null && chart.containsKey("result")) {
                            List<Object> resultList = (List<Object>) chart.get("result");
                            if (resultList != null && !resultList.isEmpty() && resultList.get(0) != null) {
                                Object firstResult = resultList.get(0);
                                if (firstResult instanceof Map) {
                                    Map<String, Object> resultMap = (Map<String, Object>) firstResult;
                                    if (resultMap.containsKey("meta")) {
                                        Map<String, Object> meta = (Map<String, Object>) resultMap.get("meta");
                                        if (meta != null && meta.containsKey("regularMarketPrice")) {
                                            Object priceObj = meta.get("regularMarketPrice");
                                            if (priceObj != null) {
                                                prices.put(cleanSymbol, Double.parseDouble(priceObj.toString()));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Direct Yahoo Finance v8 chart API fallback failed for symbol {}: {}", cleanSymbol, e.getMessage());
            }
        }
        return prices;
    }
}
