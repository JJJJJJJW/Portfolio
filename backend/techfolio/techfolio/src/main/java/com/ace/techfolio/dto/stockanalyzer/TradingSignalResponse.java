package com.ace.techfolio.dto.stockanalyzer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO for a trading signal analysis result.
 * Includes the mandatory disclaimer in every response.
 */
public class TradingSignalResponse {

    private String symbol;
    private String signal;
    private Integer confidence;
    private BigDecimal entryPrice;
    private BigDecimal targetPrice;
    private BigDecimal stopLoss;
    private Double riskRewardRatio;
    private String reasoning;
    private String timeHorizon;
    private String factors;
    private LocalDateTime analyzedAt;
    private LocalDate dataAsOf;
    private String disclaimer;

    public TradingSignalResponse() {
        this.disclaimer = "This is algorithmic analysis for educational purposes only. "
                + "Not financial advice. Always do your own research before trading.";
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getSignal() { return signal; }
    public void setSignal(String signal) { this.signal = signal; }

    public Integer getConfidence() { return confidence; }
    public void setConfidence(Integer confidence) { this.confidence = confidence; }

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

    public String getTimeHorizon() { return timeHorizon; }
    public void setTimeHorizon(String timeHorizon) { this.timeHorizon = timeHorizon; }

    public String getFactors() { return factors; }
    public void setFactors(String factors) { this.factors = factors; }

    public LocalDateTime getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(LocalDateTime analyzedAt) { this.analyzedAt = analyzedAt; }

    public LocalDate getDataAsOf() { return dataAsOf; }
    public void setDataAsOf(LocalDate dataAsOf) { this.dataAsOf = dataAsOf; }

    public String getDisclaimer() { return disclaimer; }
    public void setDisclaimer(String disclaimer) { this.disclaimer = disclaimer; }
}
