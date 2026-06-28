package com.ace.techfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for triggering a portfolio audit analysis.
 */
public class PortfolioAuditRequest {

    @NotBlank(message = "Investment timeline is required")
    @Size(max = 50, message = "Investment timeline must be at most 50 characters")
    private String investmentTimeline;

    public PortfolioAuditRequest() {
    }

    public PortfolioAuditRequest(String investmentTimeline) {
        this.investmentTimeline = investmentTimeline;
    }

    public String getInvestmentTimeline() {
        return investmentTimeline;
    }

    public void setInvestmentTimeline(String investmentTimeline) {
        this.investmentTimeline = investmentTimeline;
    }
}
