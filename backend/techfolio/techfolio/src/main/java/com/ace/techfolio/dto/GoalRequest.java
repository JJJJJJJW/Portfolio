package com.ace.techfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for creating a financial goal.
 */
public record GoalRequest(
        @NotBlank(message = "Goal name is required")
        @Size(max = 150)
        String name,

        @NotBlank(message = "Category is required")
        String category,

        @NotNull(message = "Target amount is required")
        @DecimalMin(value = "0.01", message = "Target amount must be greater than zero")
        BigDecimal targetAmount,

        @NotBlank(message = "Target date is required")
        String targetDate
) {}
