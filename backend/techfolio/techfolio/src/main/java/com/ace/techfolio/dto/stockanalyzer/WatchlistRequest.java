package com.ace.techfolio.dto.stockanalyzer;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for adding tickers to a user's watchlist.
 */
public class WatchlistRequest {

    @NotEmpty(message = "At least one symbol is required")
    @Size(max = 50, message = "Cannot add more than 50 symbols at once")
    private List<String> symbols;

    public WatchlistRequest() {
    }

    public WatchlistRequest(List<String> symbols) {
        this.symbols = symbols;
    }

    public List<String> getSymbols() { return symbols; }
    public void setSymbols(List<String> symbols) { this.symbols = symbols; }
}
