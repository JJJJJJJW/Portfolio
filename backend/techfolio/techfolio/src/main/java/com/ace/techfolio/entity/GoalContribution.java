package com.ace.techfolio.entity;

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
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Individual savings contribution toward a {@link Goal}.
 * Maps to the frontend {@code Contribution} interface in Goals/types.ts.
 *
 * <p>{@code contributedOn} tracks the actual date of contribution,
 * separate from {@code createdAt} (the record insertion timestamp).</p>
 */
@Entity
@Table(name = "goal_contributions")
public class GoalContribution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @NotNull(message = "Contribution amount is required")
    @DecimalMin(value = "0.01", message = "Contribution must be greater than zero")
    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Size(max = 300)
    @Column(name = "note", length = 300)
    private String note;

    @NotNull(message = "Contribution date is required")
    @Column(name = "contributed_on", nullable = false)
    private LocalDate contributedOn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // =========================================================================
    // Lifecycle Callbacks
    // =========================================================================

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // =========================================================================
    // Constructors
    // =========================================================================

    public GoalContribution() {
    }

    public GoalContribution(BigDecimal amount, String note, LocalDate contributedOn) {
        this.amount = amount;
        this.note = note;
        this.contributedOn = contributedOn;
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Goal getGoal() {
        return goal;
    }

    public void setGoal(Goal goal) {
        this.goal = goal;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDate getContributedOn() {
        return contributedOn;
    }

    public void setContributedOn(LocalDate contributedOn) {
        this.contributedOn = contributedOn;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
