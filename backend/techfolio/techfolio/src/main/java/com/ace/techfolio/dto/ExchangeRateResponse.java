package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response DTO mapping for currency exchange rate data.
 */
public record ExchangeRateResponse(
        String symbol,
        BigDecimal rate,
        Instant fetchedAt
) {}
