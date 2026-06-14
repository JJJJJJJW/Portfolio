package com.ace.techfolio.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Safe, stateless service wrapper for Twelve Data API.
 * Optimized for low memory usage (512MB RAM constraints) and serial GC.
 * All parsed response objects are locally scoped within methods to be GC-eligible immediately.
 *
 * <p>Uses Spring Boot's built-in {@link JsonParser} to avoid requiring Jackson on the classpath.</p>
 */
@Service
public class TwelveDataService {

    private static final Logger log = LoggerFactory.getLogger(TwelveDataService.class);

    private final RestTemplate restTemplate;
    private final JsonParser jsonParser;

    @Value("${TWELVEDATA_API_KEY:}")
    private String apiKey;

    public TwelveDataService() {
        this.jsonParser = JsonParserFactory.getJsonParser();

        // Use a configured SimpleClientHttpRequestFactory to set connection and read timeouts
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 5 seconds connection timeout
        factory.setReadTimeout(5000);    // 5 seconds read timeout
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Fetches the latest price for a single symbol.
     * Returns a fallback price of 0.0 in case of error.
     */
    public double getPrice(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            log.warn("Symbol is empty, returning fallback price 0.0");
            return 0.0;
        }

        String cleanSymbol = symbol.trim().toUpperCase();

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Twelve Data API key is not configured, returning fallback price 0.0 for symbol: {}", cleanSymbol);
            return 0.0;
        }

        try {
            String url = UriComponentsBuilder.fromUriString("https://api.twelvedata.com/price")
                    .queryParam("symbol", cleanSymbol)
                    .queryParam("apikey", apiKey)
                    .build()
                    .toUriString();

            log.info("Fetching price from Twelve Data for symbol: {}", cleanSymbol);
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                log.warn("Received empty response from Twelve Data for symbol: {}", cleanSymbol);
                return 0.0;
            }

            // Parse response locally to allow rapid GC collection
            Map<String, Object> root = jsonParser.parseMap(responseBody);

            if ("error".equalsIgnoreCase(String.valueOf(root.get("status")))) {
                String errorMsg = root.getOrDefault("message", "Unknown error").toString();
                String errorCode = root.getOrDefault("code", "0").toString();
                log.error("Twelve Data API error (code: {}): {} for symbol: {}", errorCode, errorMsg, cleanSymbol);
                return 0.0;
            }

            if (root.containsKey("price")) {
                String priceStr = root.get("price").toString();
                try {
                    return Double.parseDouble(priceStr);
                } catch (NumberFormatException e) {
                    log.error("Failed to parse price '{}' as double for symbol: {}", priceStr, cleanSymbol, e);
                    return 0.0;
                }
            } else {
                log.warn("Response from Twelve Data for symbol: {} did not contain 'price' or error status", cleanSymbol);
                return 0.0;
            }

        } catch (Exception e) {
            log.error("Unexpected error fetching price from Twelve Data for symbol: {}", cleanSymbol, e);
            return 0.0;
        }
    }

    /**
     * Fetches prices for a list of symbols in a single batch request to Twelve Data.
     * Returns a map containing symbol to price mappings. Invalid symbols or error results are omitted.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Double> getPrices(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Map.of();
        }

        List<String> cleanSymbols = symbols.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .toList();

        if (cleanSymbols.isEmpty()) {
            return Map.of();
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Twelve Data API key is not configured, returning empty prices map");
            return Map.of();
        }

        Map<String, Double> result = new HashMap<>();

        try {
            String symbolsParam = String.join(",", cleanSymbols);
            String url = UriComponentsBuilder.fromUriString("https://api.twelvedata.com/price")
                    .queryParam("symbol", symbolsParam)
                    .queryParam("apikey", apiKey)
                    .build()
                    .toUriString();

            log.info("Fetching batch prices from Twelve Data for: {}", symbolsParam);
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                log.warn("Received empty batch response from Twelve Data");
                return Map.of();
            }

            // Parse response locally to allow rapid GC collection
            Map<String, Object> root = jsonParser.parseMap(responseBody);

            // Check for top-level error
            if ("error".equalsIgnoreCase(String.valueOf(root.get("status")))) {
                String errorMsg = root.getOrDefault("message", "Unknown error").toString();
                String errorCode = root.getOrDefault("code", "0").toString();
                log.error("Twelve Data API batch error (code: {}): {}", errorCode, errorMsg);
                return Map.of();
            }

            // Single symbol query returns flat format: {"price": "150.00"}
            if (cleanSymbols.size() == 1) {
                String singleSymbol = cleanSymbols.get(0);
                if (root.containsKey("price")) {
                    try {
                        double price = Double.parseDouble(root.get("price").toString());
                        result.put(singleSymbol, price);
                    } catch (NumberFormatException e) {
                        log.error("Failed to parse single price '{}' for symbol: {}", root.get("price"), singleSymbol, e);
                    }
                }
            } else {
                // Batch format: {"AAPL": {"price": "150.00"}, "MSFT": {"price": "300.00"}}
                for (Map.Entry<String, Object> entry : root.entrySet()) {
                    String sym = entry.getKey().toUpperCase();
                    Object value = entry.getValue();

                    if (!(value instanceof Map)) {
                        continue;
                    }

                    Map<String, Object> symbolData = (Map<String, Object>) value;

                    if (symbolData.containsKey("price")) {
                        try {
                            double price = Double.parseDouble(symbolData.get("price").toString());
                            result.put(sym, price);
                        } catch (NumberFormatException e) {
                            log.error("Failed to parse price '{}' for symbol: {}", symbolData.get("price"), sym, e);
                        }
                    } else if ("error".equalsIgnoreCase(String.valueOf(symbolData.get("status")))) {
                        String errorMsg = symbolData.getOrDefault("message", "Unknown error").toString();
                        log.warn("Twelve Data API error for symbol {}: {}", sym, errorMsg);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Unexpected error fetching batch prices from Twelve Data", e);
        }

        return result;
    }

    /**
     * Searches for symbols using Twelve Data's /symbol_search endpoint.
     * Returns a list of maps with keys: symbol, name, type, exchange.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, String>> searchSymbols(String query) {
        List<Map<String, String>> results = new ArrayList<>();

        if (query == null || query.isBlank()) {
            return results;
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Twelve Data API key is not configured, returning empty search results");
            return results;
        }

        try {
            String url = UriComponentsBuilder.fromUriString("https://api.twelvedata.com/symbol_search")
                    .queryParam("symbol", query.trim())
                    .queryParam("apikey", apiKey)
                    .build()
                    .toUriString();

            log.info("Searching Twelve Data for: {}", query.trim());
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return results;
            }

            Map<String, Object> root = jsonParser.parseMap(responseBody);

            if ("error".equalsIgnoreCase(String.valueOf(root.get("status")))) {
                log.error("Twelve Data search error: {}", root.getOrDefault("message", "Unknown"));
                return results;
            }

            Object data = root.get("data");
            if (data instanceof List<?> dataList) {
                for (Object item : dataList) {
                    if (item instanceof Map<?, ?> entry) {
                        Map<String, String> result = new HashMap<>();
                        result.put("symbol", String.valueOf(entry.get("symbol")));
                        result.put("name", String.valueOf(entry.get("instrument_name")));
                        result.put("type", String.valueOf(entry.get("instrument_type")));
                        result.put("exchange", String.valueOf(entry.get("exchange")));
                        results.add(result);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Unexpected error searching Twelve Data for: {}", query, e);
        }

        return results;
    }
}
