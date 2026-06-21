package com.ace.techfolio.dto.stockanalyzer;

import java.util.List;

/**
 * Paginated response DTO for historical trading signals.
 */
public class SignalHistoryResponse {

    private List<TradingSignalResponse> signals;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private String disclaimer;

    public SignalHistoryResponse() {
        this.disclaimer = "This is algorithmic analysis for educational purposes only. "
                + "Not financial advice. Always do your own research before trading.";
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public List<TradingSignalResponse> getSignals() { return signals; }
    public void setSignals(List<TradingSignalResponse> signals) { this.signals = signals; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public String getDisclaimer() { return disclaimer; }
    public void setDisclaimer(String disclaimer) { this.disclaimer = disclaimer; }
}
