package com.ace.techfolio.dto.stockanalyzer;

/**
 * DTO for messages published to the {@code stock_analysis_queue}.
 *
 * <p>Each message represents a single stock ticker to be analyzed
 * by the queue consumer worker. Includes retry tracking for DLQ
 * escalation after max retries are exhausted.</p>
 */
public class StockAnalysisMessage {

    /** The stock ticker symbol (e.g., "NVDA"). */
    private String ticker;

    /** The user's risk appetite profile (e.g., "AGGRESSIVE", "MODERATE"). */
    private String riskProfile;

    /** When this message was first enqueued. */
    private String enqueuedAt;

    /** Number of times this message has been retried (for DLQ tracking). */
    private int retryCount;

    public StockAnalysisMessage() {
    }

    public StockAnalysisMessage(String ticker, String riskProfile) {
        this.ticker = ticker;
        this.riskProfile = riskProfile;
        this.enqueuedAt = java.time.LocalDateTime.now().toString();
        this.retryCount = 0;
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getRiskProfile() { return riskProfile; }
    public void setRiskProfile(String riskProfile) { this.riskProfile = riskProfile; }

    public String getEnqueuedAt() { return enqueuedAt; }
    public void setEnqueuedAt(String enqueuedAt) { this.enqueuedAt = enqueuedAt; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    @Override
    public String toString() {
        return "StockAnalysisMessage{ticker='" + ticker + "', riskProfile='" + riskProfile +
                "', retryCount=" + retryCount + "}";
    }
}
