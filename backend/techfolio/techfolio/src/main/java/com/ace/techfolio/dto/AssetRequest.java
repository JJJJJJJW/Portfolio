package com.ace.techfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for creating or updating an asset/position.
 */
public record AssetRequest(
        @NotBlank(message = "Asset name is required")
        @Size(max = 150)
        String name,

        @Size(max = 20)
        String symbol,

        @NotBlank(message = "Category is required")
        String category,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0", message = "Quantity must be non-negative")
        BigDecimal quantity,

        @NotNull(message = "Average price is required")
        @DecimalMin(value = "0", message = "Average price must be non-negative")
        BigDecimal avgPrice,

        @NotNull(message = "Current price is required")
        @DecimalMin(value = "0", message = "Current price must be non-negative")
        BigDecimal currentPrice
) {}
