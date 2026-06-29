package com.ace.techfolio.dto.stockanalyzer;

import java.math.BigDecimal;

/**
 * DTO for messages published to the {@code user_notifications} queue.
 *
 * <p>Contains the essential BUY signal details needed to compose
 * an email notification to the admin.</p>
 */
public class NotificationMessage {

    /** The stock ticker symbol. */
    private String ticker;

    /** The trading signal (always "BUY" for notifications). */
    private String signal;

    /** AI confidence level (0-100). */
    private int confidence;

    /** Recommended entry price. */
    private BigDecimal entryPrice;

    /** Target price for profit taking. */
    private BigDecimal targetPrice;

    /** Stop-loss price. */
    private BigDecimal stopLoss;

    /** Risk/reward ratio. */
    private Double riskRewardRatio;

    /** AI reasoning summary. */
    private String reasoning;

    /** When the signal was generated. */
    private String timestamp;

    public NotificationMessage() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getSignal() { return signal; }
    public void setSignal(String signal) { this.signal = signal; }

    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }

    public BigDecimal getEntryPrice() { return entryPrice; }
    public void setEntryPrice(BigDecimal entryPrice) { this.entryPrice = entryPrice; }

    public BigDecimal getTargetPrice() { return targetPrice; }
    public void setTargetPrice(BigDecimal targetPrice) { this.targetPrice = targetPrice; }

    public BigDecimal getStopLoss() { return stopLoss; }
    public void setStopLoss(BigDecimal stopLoss) { this.stopLoss = stopLoss; }

    public Double getRiskRewardRatio() { return riskRewardRatio; }
    public void setRiskRewardRatio(Double riskRewardRatio) { this.riskRewardRatio = riskRewardRatio; }

    public String getReasoning() { return reasoning; }
    public void setReasoning(String reasoning) { this.reasoning = reasoning; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return "NotificationMessage{ticker='" + ticker + "', signal='" + signal +
                "', confidence=" + confidence + "}";
    }
}
