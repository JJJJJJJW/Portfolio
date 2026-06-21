package com.ace.techfolio.entity.stockanalyzer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Daily OHLCV price data with calculated technical indicators for a single ticker.
 *
 * <p>Each row represents one trading day. Technical indicators (RSI, SMA, MACD)
 * are calculated locally via ta4j using Polygon.io price data — zero additional
 * API calls required.</p>
 */
@Entity
@Table(name = "stock_snapshots", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"symbol", "date"})
})
public class StockSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "open_price", precision = 19, scale = 4)
    private BigDecimal open;

    @Column(name = "high_price", precision = 19, scale = 4)
    private BigDecimal high;

    @Column(name = "low_price", precision = 19, scale = 4)
    private BigDecimal low;

    @Column(name = "close_price", precision = 19, scale = 4)
    private BigDecimal close;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "rsi14")
    private Double rsi14;

    @Column(name = "sma50", precision = 19, scale = 4)
    private BigDecimal sma50;

    @Column(name = "sma200", precision = 19, scale = 4)
    private BigDecimal sma200;

    @Column(name = "macd_line")
    private Double macdLine;

    @Column(name = "macd_signal")
    private Double macdSignal;

    @Column(name = "macd_histogram")
    private Double macdHistogram;

    // =========================================================================
    // Constructors
    // =========================================================================

    public StockSnapshot() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public BigDecimal getOpen() { return open; }
    public void setOpen(BigDecimal open) { this.open = open; }

    public BigDecimal getHigh() { return high; }
    public void setHigh(BigDecimal high) { this.high = high; }

    public BigDecimal getLow() { return low; }
    public void setLow(BigDecimal low) { this.low = low; }

    public BigDecimal getClose() { return close; }
    public void setClose(BigDecimal close) { this.close = close; }

    public Long getVolume() { return volume; }
    public void setVolume(Long volume) { this.volume = volume; }

    public Double getRsi14() { return rsi14; }
    public void setRsi14(Double rsi14) { this.rsi14 = rsi14; }

    public BigDecimal getSma50() { return sma50; }
    public void setSma50(BigDecimal sma50) { this.sma50 = sma50; }

    public BigDecimal getSma200() { return sma200; }
    public void setSma200(BigDecimal sma200) { this.sma200 = sma200; }

    public Double getMacdLine() { return macdLine; }
    public void setMacdLine(Double macdLine) { this.macdLine = macdLine; }

    public Double getMacdSignal() { return macdSignal; }
    public void setMacdSignal(Double macdSignal) { this.macdSignal = macdSignal; }

    public Double getMacdHistogram() { return macdHistogram; }
    public void setMacdHistogram(Double macdHistogram) { this.macdHistogram = macdHistogram; }
}
