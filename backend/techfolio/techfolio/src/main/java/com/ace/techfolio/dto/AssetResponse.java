package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Response DTO for asset/position data.
 * Matches the frontend Position interface shape.
 */
public record AssetResponse(
        UUID id,
        String name,
        String symbol,
        String category,
        BigDecimal quantity,
        BigDecimal avgPrice,
        BigDecimal currentPrice,
        BigDecimal totalValue,
        BigDecimal pl,
        boolean isCustom,
        String currency
) {}
