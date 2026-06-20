package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Response DTO for transaction data.
 * Matches the frontend Transaction interface shape.
 */
public record TransactionResponse(
        UUID id,
        String date,
        String type,
        String symbol,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal totalAmount,
        String currency,
        String category,
        Boolean isCustom,
        BigDecimal customExchangeRate
) {}
