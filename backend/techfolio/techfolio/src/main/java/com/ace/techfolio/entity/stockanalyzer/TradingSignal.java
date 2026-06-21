package com.ace.techfolio.entity.stockanalyzer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AI-generated trading signal output from GPT-4o-mini analysis.
 *
 * <p>Stores the complete signal (BUY/HOLD/AVOID), confidence level,
 * price targets, risk/reward ratio, and natural language reasoning.
 * The {@code factors} field stores a JSON string with the breakdown
 * of technical/fundamental/macro/sentiment assessments.</p>
 */
@Entity
@Table(name = "trading_signals")
public class TradingSignal {

    public static final String DISCLAIMER =
            "This is algorithmic analysis for educational purposes only. " +
            "Not financial advice. Always do your own research before trading.";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "signal", nullable = false, length = 10)
    private String signal;

    @Column(name = "confidence")
    private Integer confidence;

    @Column(name = "entry_price", precision = 19, scale = 4)
    private BigDecimal entryPrice;

    @Column(name = "target_price", precision = 19, scale = 4)
    private BigDecimal targetPrice;

    @Column(name = "stop_loss", precision = 19, scale = 4)
    private BigDecimal stopLoss;

    @Column(name = "risk_reward_ratio")
    private Double riskRewardRatio;

    @Column(name = "reasoning", columnDefinition = "TEXT")
    private String reasoning;

    @Column(name = "time_horizon", length = 50)
    private String timeHorizon;

    @Column(name = "factors", columnDefinition = "TEXT")
    private String factors;

    @Column(name = "analyzed_at", nullable = false)
    private LocalDateTime analyzedAt;

    @Column(name = "data_as_of")
    private LocalDate dataAsOf;

    // =========================================================================
    // Constructors
    // =========================================================================

    public TradingSignal() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

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
}
