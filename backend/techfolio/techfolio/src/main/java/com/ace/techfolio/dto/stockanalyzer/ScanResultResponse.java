package com.ace.techfolio.dto.stockanalyzer;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO summarizing a full pipeline scan execution.
 */
public class ScanResultResponse {

    private String status;
    private int candidatesScreened;
    private int signalsGenerated;
    private List<String> errors;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String disclaimer;

    public ScanResultResponse() {
        this.disclaimer = "This is algorithmic analysis for educational purposes only. "
                + "Not financial advice. Always do your own research before trading.";
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getCandidatesScreened() { return candidatesScreened; }
    public void setCandidatesScreened(int candidatesScreened) { this.candidatesScreened = candidatesScreened; }

    public int getSignalsGenerated() { return signalsGenerated; }
    public void setSignalsGenerated(int signalsGenerated) { this.signalsGenerated = signalsGenerated; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getDisclaimer() { return disclaimer; }
    public void setDisclaimer(String disclaimer) { this.disclaimer = disclaimer; }
}
