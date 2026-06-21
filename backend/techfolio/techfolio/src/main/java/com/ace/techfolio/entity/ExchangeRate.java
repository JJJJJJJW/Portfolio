package com.ace.techfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Represents a historical or current exchange rate entry in the database.
 */
@Entity
@Table(name = "exchange_rates")
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "rate", nullable = false, precision = 19, scale = 6)
    private BigDecimal rate;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @PrePersist
    protected void onCreate() {
        this.fetchedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.fetchedAt = Instant.now();
    }

    public ExchangeRate() {
    }

    public ExchangeRate(String symbol, BigDecimal rate) {
        this.symbol = symbol;
        this.rate = rate;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public void setFetchedAt(Instant fetchedAt) {
        this.fetchedAt = fetchedAt;
    }
}
