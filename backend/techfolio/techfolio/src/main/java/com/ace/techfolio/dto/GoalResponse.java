package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for goal data.
 * Matches the frontend FinancialGoal interface shape.
 */
public record GoalResponse(
        UUID id,
        String name,
        String category,
        BigDecimal targetAmount,
        BigDecimal currentAmount,
        String targetDate,
        String createdDate,
        List<ContributionResponse> contributions
) {}
