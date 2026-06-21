package com.ace.techfolio.dto.stockanalyzer;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for a user's watchlist.
 */
public class WatchlistResponse {

    private List<WatchlistItem> items;
    private int count;
    private int maxAllowed;

    public WatchlistResponse() {
    }

    public WatchlistResponse(List<WatchlistItem> items, int maxAllowed) {
        this.items = items;
        this.count = items.size();
        this.maxAllowed = maxAllowed;
    }

    // =========================================================================
    // Nested Item
    // =========================================================================

    public static class WatchlistItem {
        private String symbol;
        private LocalDateTime addedAt;

        public WatchlistItem() {
        }

        public WatchlistItem(String symbol, LocalDateTime addedAt) {
            this.symbol = symbol;
            this.addedAt = addedAt;
        }

        public String getSymbol() { return symbol; }
        public void setSymbol(String symbol) { this.symbol = symbol; }

        public LocalDateTime getAddedAt() { return addedAt; }
        public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public List<WatchlistItem> getItems() { return items; }
    public void setItems(List<WatchlistItem> items) { this.items = items; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public int getMaxAllowed() { return maxAllowed; }
    public void setMaxAllowed(int maxAllowed) { this.maxAllowed = maxAllowed; }
}
