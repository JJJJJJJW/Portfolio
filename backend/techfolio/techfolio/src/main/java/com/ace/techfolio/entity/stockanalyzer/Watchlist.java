package com.ace.techfolio.entity.stockanalyzer;

import com.ace.techfolio.entity.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * User-scoped ticker watchlist for the Stock Analyzer feature.
 *
 * <p>Each user can maintain up to {@code stock-analyzer.watchlist.max-tickers}
 * tickers. The watchlist is used for on-demand analysis — the automated
 * daily scan uses Polygon.io top movers only.</p>
 */
@Entity
@Table(name = "watchlist", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "symbol"})
})
public class Watchlist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @NotBlank(message = "Symbol is required")
    @Size(max = 20)
    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    // =========================================================================
    // Lifecycle Callbacks
    // =========================================================================

    @PrePersist
    protected void onCreate() {
        this.addedAt = LocalDateTime.now();
    }

    // =========================================================================
    // Constructors
    // =========================================================================

    public Watchlist() {
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public LocalDateTime getAddedAt() { return addedAt; }
}
