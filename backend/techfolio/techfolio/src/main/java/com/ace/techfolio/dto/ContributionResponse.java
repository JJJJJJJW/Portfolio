package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Response DTO for goal contribution data.
 * Matches the frontend Contribution interface shape.
 */
public record ContributionResponse(
        UUID id,
        BigDecimal amount,
        String date,
        String note
) {}
