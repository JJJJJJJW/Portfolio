package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO mapping for currency exchange rate data.
 */
public record ExchangeRateResponse(
        String symbol,
        BigDecimal rate,
        LocalDateTime fetchedAt
) {}
