package com.ace.techfolio.entity.stockanalyzer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Weekly snapshot of macroeconomic indicators sourced from FRED.
 *
 * <p>One row per date. The pipeline checks if today's snapshot exists
 * before fetching new data to avoid redundant API calls.</p>
 */
@Entity
@Table(name = "macro_snapshots")
public class MacroSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "date", nullable = false, unique = true)
    private LocalDate date;

    @Column(name = "fed_funds_rate")
    private Double fedFundsRate;

    @Column(name = "treasury_10y")
    private Double treasury10Y;

    @Column(name = "cpi_yoy")
    private Double cpiYoY;

    @Column(name = "spy_vs_200sma", length = 10)
    private String spyVs200SMA;

    @Column(name = "vix")
    private Double vix;

    // =========================================================================
    // Constructors
    // =========================================================================

    public MacroSnapshot() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Double getFedFundsRate() { return fedFundsRate; }
    public void setFedFundsRate(Double fedFundsRate) { this.fedFundsRate = fedFundsRate; }

    public Double getTreasury10Y() { return treasury10Y; }
    public void setTreasury10Y(Double treasury10Y) { this.treasury10Y = treasury10Y; }

    public Double getCpiYoY() { return cpiYoY; }
    public void setCpiYoY(Double cpiYoY) { this.cpiYoY = cpiYoY; }

    public String getSpyVs200SMA() { return spyVs200SMA; }
    public void setSpyVs200SMA(String spyVs200SMA) { this.spyVs200SMA = spyVs200SMA; }

    public Double getVix() { return vix; }
    public void setVix(Double vix) { this.vix = vix; }
}
