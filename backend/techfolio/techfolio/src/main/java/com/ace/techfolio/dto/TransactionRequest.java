package com.ace.techfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for creating a transaction (BUY/SELL).
 */
public record TransactionRequest(
        @NotBlank(message = "Transaction type is required")
        String type,

        @NotBlank(message = "Symbol is required")
        @Size(max = 20)
        String symbol,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.0001", message = "Quantity must be greater than zero")
        BigDecimal quantity,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than zero")
        BigDecimal price,

        @NotBlank(message = "Date is required")
        String date
) {}
