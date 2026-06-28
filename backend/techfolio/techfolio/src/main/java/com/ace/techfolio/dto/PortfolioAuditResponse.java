package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for a completed portfolio audit analysis.
 * Structured to render the audit report UI with dynamic sections.
 */
public class PortfolioAuditResponse {

    private UUID id;
    private LocalDateTime analyzedAt;
    private BigDecimal portfolioValue;
    private String investmentTimeline;
    private String riskAppetite;
    private int overallRiskScore;
    private String summary;
    private List<ConcentrationRisk> concentrationRisks;
    private List<SavingsWarning> savingsWarnings;
    private String diversificationAdvice;
    private List<ActionItem> actionItems;

    // =========================================================================
    // Nested DTOs
    // =========================================================================

    public static class ConcentrationRisk {
        private String asset;
        private double allocationPct;
        private String severity;
        private String advice;

        public ConcentrationRisk() {}

        public ConcentrationRisk(String asset, double allocationPct, String severity, String advice) {
            this.asset = asset;
            this.allocationPct = allocationPct;
            this.severity = severity;
            this.advice = advice;
        }

        public String getAsset() { return asset; }
        public void setAsset(String asset) { this.asset = asset; }
        public double getAllocationPct() { return allocationPct; }
        public void setAllocationPct(double allocationPct) { this.allocationPct = allocationPct; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getAdvice() { return advice; }
        public void setAdvice(String advice) { this.advice = advice; }
    }

    public static class SavingsWarning {
        private String title;
        private String advice;

        public SavingsWarning() {}

        public SavingsWarning(String title, String advice) {
            this.title = title;
            this.advice = advice;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getAdvice() { return advice; }
        public void setAdvice(String advice) { this.advice = advice; }
    }

    public static class ActionItem {
        private String text;
        private String priority;
        private boolean completed;

        public ActionItem() {}

        public ActionItem(String text, String priority) {
            this.text = text;
            this.priority = priority;
            this.completed = false;
        }

        public ActionItem(String text, String priority, boolean completed) {
            this.text = text;
            this.priority = priority;
            this.completed = completed;
        }

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDateTime getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(LocalDateTime analyzedAt) { this.analyzedAt = analyzedAt; }

    public BigDecimal getPortfolioValue() { return portfolioValue; }
    public void setPortfolioValue(BigDecimal portfolioValue) { this.portfolioValue = portfolioValue; }

    public String getInvestmentTimeline() { return investmentTimeline; }
    public void setInvestmentTimeline(String investmentTimeline) { this.investmentTimeline = investmentTimeline; }

    public String getRiskAppetite() { return riskAppetite; }
    public void setRiskAppetite(String riskAppetite) { this.riskAppetite = riskAppetite; }

    public int getOverallRiskScore() { return overallRiskScore; }
    public void setOverallRiskScore(int overallRiskScore) { this.overallRiskScore = overallRiskScore; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public List<ConcentrationRisk> getConcentrationRisks() { return concentrationRisks; }
    public void setConcentrationRisks(List<ConcentrationRisk> concentrationRisks) { this.concentrationRisks = concentrationRisks; }

    public List<SavingsWarning> getSavingsWarnings() { return savingsWarnings; }
    public void setSavingsWarnings(List<SavingsWarning> savingsWarnings) { this.savingsWarnings = savingsWarnings; }

    public String getDiversificationAdvice() { return diversificationAdvice; }
    public void setDiversificationAdvice(String diversificationAdvice) { this.diversificationAdvice = diversificationAdvice; }

    public List<ActionItem> getActionItems() { return actionItems; }
    public void setActionItems(List<ActionItem> actionItems) { this.actionItems = actionItems; }
}
