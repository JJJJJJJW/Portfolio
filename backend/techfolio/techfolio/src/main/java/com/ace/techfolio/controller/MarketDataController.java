package com.ace.techfolio.controller;

import com.ace.techfolio.dto.ExchangeRateResponse;
import com.ace.techfolio.entity.AssetMaster;
import com.ace.techfolio.repository.AssetMasterRepository;
import com.ace.techfolio.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * REST controller for the Unified Market Data Router.
 * Provides autocomplete search and batch pricing across Bursa Malaysia and global markets.
 *
 * <p>All endpoints are publicly accessible (configured in SecurityConfig)
 * so that both guest and authenticated users can search and fetch prices.</p>
 */
@RestController
@RequestMapping("/api/v1/market")
public class MarketDataController {

    private final MarketDataService marketDataService;
    private final AssetMasterRepository assetMasterRepository;

    public MarketDataController(MarketDataService marketDataService, AssetMasterRepository assetMasterRepository) {
        this.marketDataService = marketDataService;
        this.assetMasterRepository = assetMasterRepository;
    }

    /**
     * Autocomplete search for tickers using local PostgreSQL asset_master table lookup.
     * Capped at 10 results to maintain low memory profile.
     *
     * @param query the search term (e.g., "AAPL", "1155", "Maybank")
     * @return list of matching symbols with name, type, and exchange from database
     */
    @GetMapping("/search")
    public ResponseEntity<List<AssetMaster>> search(@RequestParam String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(assetMasterRepository.searchAssets(query.trim()));
    }

    /**
     * Fetch live price of a specific selected ticker from external APIs.
     *
     * @param ticker ticker symbol (e.g., "AAPL", "1155.KL", "BTC/USD")
     * @return live price value
     */
    @GetMapping("/price")
    public ResponseEntity<Double> getPrice(@RequestParam String ticker) {
        if (ticker == null || ticker.isBlank()) {
            return ResponseEntity.ok(0.0);
        }
        Double price = marketDataService.getBatchPrices(List.of(ticker))
                .getOrDefault(ticker.trim().toUpperCase(), 0.0);
        return ResponseEntity.ok(price);
    }

    /**
     * Batch price lookup for a comma-separated list of tickers.
     *
     * <p>Automatically routes .KL tickers to Yahoo Finance and the rest to Twelve Data,
     * executing exactly two efficient bulk calls instead of N individual requests.</p>
     *
     * @param tickers comma-separated ticker symbols (e.g., "1155.KL,AAPL,BTC/USD")
     * @return flat map of Ticker → Current Price (0.0 fallback on failure)
     */
    @GetMapping("/prices")
    public ResponseEntity<Map<String, Double>> getBatchPrices(@RequestParam String tickers) {
        List<String> tickerList = Arrays.stream(tickers.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        return ResponseEntity.ok(marketDataService.getBatchPrices(tickerList));
    }

    /**
     * Get the latest exchange rate with fetch timestamp.
     *
     * @param symbol currency pair (default "USD/MYR")
     * @return latest exchange rate and timestamp
     */
    @GetMapping("/exchange-rate")
    public ResponseEntity<ExchangeRateResponse> getLatestExchangeRate(@RequestParam(defaultValue = "USD/MYR") String symbol) {
        return ResponseEntity.ok(marketDataService.getLatestExchangeRate(symbol));
    }
}
