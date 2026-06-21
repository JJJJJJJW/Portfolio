package com.ace.techfolio.entity.stockanalyzer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Quarterly-refreshed company fundamental data sourced from Finnhub.
 *
 * <p>One row per symbol. Updated when data is older than {@code updatedAt}
 * threshold (typically 24 hours during pipeline runs).</p>
 */
@Entity
@Table(name = "fundamental_data")
public class FundamentalData {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "symbol", nullable = false, unique = true, length = 20)
    private String symbol;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "pe_ratio")
    private Double peRatio;

    @Column(name = "eps_growth_yoy")
    private Double epsGrowthYoY;

    @Column(name = "revenue_growth_yoy")
    private Double revenueGrowthYoY;

    @Column(name = "debt_to_equity")
    private Double debtToEquity;

    @Column(name = "market_cap")
    private Long marketCap;

    @Column(name = "high_52_week", precision = 19, scale = 4)
    private BigDecimal high52Week;

    @Column(name = "low_52_week", precision = 19, scale = 4)
    private BigDecimal low52Week;

    @Column(name = "avg_volume")
    private Long avgVolume;

    @Column(name = "sector", length = 100)
    private String sector;

    // =========================================================================
    // Lifecycle Callbacks
    // =========================================================================

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // =========================================================================
    // Constructors
    // =========================================================================

    public FundamentalData() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Double getPeRatio() { return peRatio; }
    public void setPeRatio(Double peRatio) { this.peRatio = peRatio; }

    public Double getEpsGrowthYoY() { return epsGrowthYoY; }
    public void setEpsGrowthYoY(Double epsGrowthYoY) { this.epsGrowthYoY = epsGrowthYoY; }

    public Double getRevenueGrowthYoY() { return revenueGrowthYoY; }
    public void setRevenueGrowthYoY(Double revenueGrowthYoY) { this.revenueGrowthYoY = revenueGrowthYoY; }

    public Double getDebtToEquity() { return debtToEquity; }
    public void setDebtToEquity(Double debtToEquity) { this.debtToEquity = debtToEquity; }

    public Long getMarketCap() { return marketCap; }
    public void setMarketCap(Long marketCap) { this.marketCap = marketCap; }

    public BigDecimal getHigh52Week() { return high52Week; }
    public void setHigh52Week(BigDecimal high52Week) { this.high52Week = high52Week; }

    public BigDecimal getLow52Week() { return low52Week; }
    public void setLow52Week(BigDecimal low52Week) { this.low52Week = low52Week; }

    public Long getAvgVolume() { return avgVolume; }
    public void setAvgVolume(Long avgVolume) { this.avgVolume = avgVolume; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
}
