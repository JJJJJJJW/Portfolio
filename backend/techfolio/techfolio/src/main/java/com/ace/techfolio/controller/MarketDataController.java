package com.ace.techfolio.controller;

import com.ace.techfolio.dto.MarketSearchResult;
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

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    /**
     * Autocomplete search for tickers across Bursa Malaysia and global markets.
     *
     * <p>Routing logic:</p>
     * <ul>
     *   <li>Purely numeric query or ".KL" suffix → Bursa Malaysia local lookup</li>
     *   <li>Otherwise → Twelve Data /symbol_search</li>
     * </ul>
     *
     * @param query the search term (e.g., "AAPL", "1155", "Maybank")
     * @return list of matching symbols with name, type, and exchange
     */
    @GetMapping("/search")
    public ResponseEntity<List<MarketSearchResult>> search(@RequestParam String query) {
        return ResponseEntity.ok(marketDataService.search(query));
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
}
