package com.ace.techfolio.dto;

/**
 * Lightweight DTO for market symbol search autocomplete results.
 * Used by the Unified Market Data Router.
 */
public record MarketSearchResult(
        String symbol,
        String name,
        String type,
        String exchange
) {}
