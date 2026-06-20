package com.ace.techfolio.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data transfer object representing the dashboard summary metrics, classification
 * breakdown, and historical trend series.
 */
public record DashboardSummaryResponse(
        BigDecimal portfolioValue,
        BigDecimal portfolioChange,
        BigDecimal investmentReturns,
        BigDecimal returnsChange,
        String annualisedReturn,
        BigDecimal annualisedChange,
        BigDecimal realisedPL,
        List<String> assetClassLabels,
        List<Double> assetClassSeries,
        List<String> monthlyCategories,
        List<BigDecimal> monthlySeries,
        List<String> dailyCategories,
        List<BigDecimal> dailySeries,
        String baseCurrency
) {}
