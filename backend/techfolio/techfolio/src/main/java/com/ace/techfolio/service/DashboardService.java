package com.ace.techfolio.service;

import com.ace.techfolio.dto.DashboardSummaryResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.Asset;
import com.ace.techfolio.entity.Transaction;
import com.ace.techfolio.entity.enums.AssetCategory;
import com.ace.techfolio.entity.enums.TransactionType;
import com.ace.techfolio.repository.AssetRepository;
import com.ace.techfolio.repository.TransactionRepository;
import com.ace.techfolio.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final AssetRepository assetRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final MarketDataService marketDataService;

    public DashboardService(AssetRepository assetRepository,
                            TransactionRepository transactionRepository,
                            UserRepository userRepository,
                            MarketDataService marketDataService) {
        this.assetRepository = assetRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.marketDataService = marketDataService;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String baseCurrency = user.getCurrency() != null && !user.getCurrency().isBlank()
                ? user.getCurrency().toUpperCase()
                : "USD";

        // Fetch USD/MYR exchange rate
        BigDecimal usdToMyrRate = BigDecimal.valueOf(4.70); // default fallback
        try {
            Double rate = marketDataService.getBatchPrices(List.of("USD/MYR")).get("USD/MYR");
            if (rate != null && rate > 0.0) {
                usdToMyrRate = BigDecimal.valueOf(rate);
            }
        } catch (Exception e) {
            // Keep default fallback
        }

        // Fetch assets and transactions
        List<Asset> assets = assetRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);

        // Fetch live prices for non-custom assets to avoid database lag
        List<String> symbols = assets.stream()
                .filter(a -> !a.isCustom())
                .map(Asset::getSymbol)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();
        Map<String, Double> livePrices = marketDataService.getBatchPrices(symbols);

        // 1. Calculate Portfolio Value & Cost Basis
        BigDecimal portfolioValue = BigDecimal.ZERO;
        BigDecimal totalCostBasis = BigDecimal.ZERO;

        for (Asset asset : assets) {
            BigDecimal qty = asset.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal currentPrice = asset.getCurrentPrice();
            if (!asset.isCustom() && asset.getSymbol() != null && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
                Double livePrice = livePrices.get(asset.getSymbol().toUpperCase());
                if (livePrice != null && livePrice > 0.0) {
                    currentPrice = BigDecimal.valueOf(livePrice);
                }
            }
            if (currentPrice == null) {
                currentPrice = BigDecimal.ZERO;
            }

            BigDecimal avgPrice = asset.getAvgPrice() != null ? asset.getAvgPrice() : BigDecimal.ZERO;

            BigDecimal assetVal = qty.multiply(currentPrice);
            BigDecimal assetCost = qty.multiply(avgPrice);

            String assetCurrency = asset.getCurrency() != null ? asset.getCurrency().toUpperCase() : "USD";
            BigDecimal convertedVal = convertCurrency(assetVal, assetCurrency, baseCurrency, usdToMyrRate);
            BigDecimal convertedCost = convertCurrency(assetCost, assetCurrency, baseCurrency, usdToMyrRate);

            portfolioValue = portfolioValue.add(convertedVal);
            totalCostBasis = totalCostBasis.add(convertedCost);
        }

        // 2. Realised P/L calculation (FIFO / average cost tracing)
        BigDecimal realisedPL = calculateRealisedPL(transactions, baseCurrency, usdToMyrRate);

        // 3. Calculate Total Investment Returns (Unrealised PL + Realised PL) & Change
        BigDecimal unrealisedPL = portfolioValue.subtract(totalCostBasis);
        BigDecimal investmentReturns = unrealisedPL.add(realisedPL);
        BigDecimal returnsChange = BigDecimal.ZERO;
        if (totalCostBasis.compareTo(BigDecimal.ZERO) > 0) {
            returnsChange = investmentReturns.divide(totalCostBasis, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // 4. Asset Class percentages
        Map<String, BigDecimal> categoryValues = new HashMap<>();
        for (Asset asset : assets) {
            BigDecimal qty = asset.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal currentPrice = asset.getCurrentPrice();
            if (!asset.isCustom() && asset.getSymbol() != null && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
                Double livePrice = livePrices.get(asset.getSymbol().toUpperCase());
                if (livePrice != null && livePrice > 0.0) {
                    currentPrice = BigDecimal.valueOf(livePrice);
                }
            }
            if (currentPrice == null) {
                currentPrice = BigDecimal.ZERO;
            }

            BigDecimal assetVal = qty.multiply(currentPrice);
            String assetCurrency = asset.getCurrency() != null ? asset.getCurrency().toUpperCase() : "USD";
            BigDecimal convertedVal = convertCurrency(assetVal, assetCurrency, baseCurrency, usdToMyrRate);

            String label = formatCategoryLabel(asset.getCategory());
            categoryValues.put(label, categoryValues.getOrDefault(label, BigDecimal.ZERO).add(convertedVal));
        }

        List<String> assetClassLabels = new ArrayList<>();
        List<Double> assetClassSeries = new ArrayList<>();

        if (portfolioValue.compareTo(BigDecimal.ZERO) > 0) {
            for (Map.Entry<String, BigDecimal> entry : categoryValues.entrySet()) {
                assetClassLabels.add(entry.getKey());
                double percentage = entry.getValue()
                        .divide(portfolioValue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
                assetClassSeries.add(percentage);
            }
        } else {
            assetClassLabels.add("No Assets Yet");
            assetClassSeries.add(100.0);
        }

        // 5. Daily Portfolio Trend (Last 7 days)
        List<String> dailyCategories = new ArrayList<>();
        List<BigDecimal> dailySeries = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter dailyFormatter = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            dailyCategories.add(date.format(dailyFormatter));
            BigDecimal valAtDate = getPortfolioValueAtDate(userId, date, assets, transactions, usdToMyrRate, baseCurrency, livePrices);
            dailySeries.add(valAtDate);
        }

        // 6. Monthly Portfolio Trend (Last 12 months)
        List<String> monthlyCategories = new ArrayList<>();
        List<BigDecimal> monthlySeries = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();
        DateTimeFormatter monthlyFormatter = DateTimeFormatter.ofPattern("MMM");

        for (int i = 11; i >= 0; i--) {
            YearMonth ym = currentMonth.minusMonths(i);
            monthlyCategories.add(ym.format(monthlyFormatter));
            LocalDate endOfMonth = ym.atEndOfMonth();
            BigDecimal valAtDate = getPortfolioValueAtDate(userId, endOfMonth, assets, transactions, usdToMyrRate, baseCurrency, livePrices);
            monthlySeries.add(valAtDate);
        }

        // Portfolio Change (Unrealised returns percentage today)
        BigDecimal portfolioChange = returnsChange;

        // Annualized return (Mock calculation or basic estimate)
        String annualisedReturn = "0%";
        BigDecimal annualisedChange = BigDecimal.ZERO;
        if (totalCostBasis.compareTo(BigDecimal.ZERO) > 0 && !transactions.isEmpty()) {
            // Find first transaction date
            LocalDate firstTxDate = transactions.stream()
                    .map(Transaction::getTransactionDate)
                    .min(LocalDate::compareTo)
                    .orElse(today);
            long days = java.time.temporal.ChronoUnit.DAYS.between(firstTxDate, today);
            if (days > 30) {
                double years = days / 365.25;
                double rawAnnualReturn = Math.pow(1.0 + returnsChange.doubleValue() / 100.0, 1.0 / years) - 1.0;
                annualisedChange = BigDecimal.valueOf(rawAnnualReturn * 100).setScale(2, RoundingMode.HALF_UP);
                annualisedReturn = String.format("%.0f%%", annualisedChange.doubleValue());
            } else {
                annualisedChange = returnsChange.setScale(2, RoundingMode.HALF_UP);
                annualisedReturn = String.format("%.0f%%", annualisedChange.doubleValue());
            }
        }

        return new DashboardSummaryResponse(
                portfolioValue.setScale(2, RoundingMode.HALF_UP),
                portfolioChange.setScale(2, RoundingMode.HALF_UP),
                investmentReturns.setScale(2, RoundingMode.HALF_UP),
                returnsChange.setScale(2, RoundingMode.HALF_UP),
                annualisedReturn,
                annualisedChange,
                realisedPL.setScale(2, RoundingMode.HALF_UP),
                assetClassLabels,
                assetClassSeries,
                monthlyCategories,
                monthlySeries,
                dailyCategories,
                dailySeries,
                baseCurrency
        );
    }

    private BigDecimal convertCurrency(BigDecimal amount, String from, String to, BigDecimal usdToMyrRate) {
        if (from.equalsIgnoreCase(to)) {
            return amount;
        }
        if (from.equalsIgnoreCase("USD") && to.equalsIgnoreCase("MYR")) {
            return amount.multiply(usdToMyrRate);
        }
        if (from.equalsIgnoreCase("MYR") && to.equalsIgnoreCase("USD")) {
            return amount.divide(usdToMyrRate, 4, RoundingMode.HALF_UP);
        }
        return amount; // Default fallback
    }

    private BigDecimal calculateRealisedPL(List<Transaction> transactions, String baseCurrency, BigDecimal usdToMyrRate) {
        List<Transaction> chronologicalTxs = transactions.stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate))
                .toList();

        Map<String, BigDecimal> runningQtyMap = new HashMap<>();
        Map<String, BigDecimal> runningTotalCostBasisMap = new HashMap<>();
        BigDecimal totalRealisedPL = BigDecimal.ZERO;

        for (Transaction t : chronologicalTxs) {
            String symbol = t.getSymbol();
            if (symbol == null || symbol.isBlank()) continue;
            symbol = symbol.toUpperCase();

            BigDecimal tQty = t.getQuantity() != null ? t.getQuantity() : BigDecimal.ZERO;
            BigDecimal tAmt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
            String txCurrency = t.getCurrency() != null ? t.getCurrency().toUpperCase() : "USD";

            BigDecimal amountInBase = convertCurrency(tAmt, txCurrency, baseCurrency, usdToMyrRate);

            BigDecimal runningQty = runningQtyMap.getOrDefault(symbol, BigDecimal.ZERO);
            BigDecimal runningTotalCostBasis = runningTotalCostBasisMap.getOrDefault(symbol, BigDecimal.ZERO);

            if (t.getType() == TransactionType.BUY) {
                runningQty = runningQty.add(tQty);
                runningTotalCostBasis = runningTotalCostBasis.add(amountInBase);

                runningQtyMap.put(symbol, runningQty);
                runningTotalCostBasisMap.put(symbol, runningTotalCostBasis);
            } else if (t.getType() == TransactionType.SELL) {
                if (runningQty.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal avgCostBasisPerUnit = runningTotalCostBasis.divide(runningQty, 6, RoundingMode.HALF_UP);
                    BigDecimal costOfSoldUnits = tQty.multiply(avgCostBasisPerUnit).setScale(4, RoundingMode.HALF_UP);
                    BigDecimal realisedPLForSell = amountInBase.subtract(costOfSoldUnits);

                    totalRealisedPL = totalRealisedPL.add(realisedPLForSell);

                    runningQty = runningQty.subtract(tQty);
                    if (runningQty.compareTo(BigDecimal.ZERO) < 0) {
                        runningQty = BigDecimal.ZERO;
                    }
                    runningTotalCostBasis = runningQty.multiply(avgCostBasisPerUnit).setScale(4, RoundingMode.HALF_UP);

                    runningQtyMap.put(symbol, runningQty);
                    runningTotalCostBasisMap.put(symbol, runningTotalCostBasis);
                }
            }
        }
        return totalRealisedPL;
    }

    private BigDecimal getPortfolioValueAtDate(UUID userId, LocalDate date, List<Asset> assets,
                                               List<Transaction> transactions, BigDecimal usdToMyrRate, String baseCurrency,
                                               Map<String, Double> livePrices) {
        BigDecimal totalValue = BigDecimal.ZERO;

        for (Asset asset : assets) {
            String symbol = asset.getSymbol();
            if (symbol == null || symbol.isBlank()) continue;

            BigDecimal qty = BigDecimal.ZERO;
            for (Transaction t : transactions) {
                if (t.getSymbol() != null && t.getSymbol().equalsIgnoreCase(symbol) && !t.getTransactionDate().isAfter(date)) {
                    BigDecimal tQty = t.getQuantity() != null ? t.getQuantity() : BigDecimal.ZERO;
                    if (t.getType() == TransactionType.BUY) {
                        qty = qty.add(tQty);
                    } else if (t.getType() == TransactionType.SELL) {
                        qty = qty.subtract(tQty);
                    }
                }
            }

            if (qty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal currentPrice = asset.getCurrentPrice();
                if (!asset.isCustom() && asset.getSymbol() != null && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
                    Double livePrice = livePrices.get(asset.getSymbol().toUpperCase());
                    if (livePrice != null && livePrice > 0.0) {
                        currentPrice = BigDecimal.valueOf(livePrice);
                    }
                }
                if (currentPrice == null) {
                    currentPrice = BigDecimal.ZERO;
                }

                BigDecimal valueInAssetCurrency = qty.multiply(currentPrice);
                String assetCurrency = asset.getCurrency() != null ? asset.getCurrency().toUpperCase() : "USD";
                BigDecimal valueInBaseCurrency = convertCurrency(valueInAssetCurrency, assetCurrency, baseCurrency, usdToMyrRate);

                totalValue = totalValue.add(valueInBaseCurrency);
            }
        }

        return totalValue.setScale(2, RoundingMode.HALF_UP);
    }

    private String formatCategoryLabel(AssetCategory category) {
        if (category == null) return "Other";
        return switch (category) {
            case STOCK -> "Equities";
            case CRYPTO -> "Crypto";
            case REAL_ESTATE -> "Real Estate";
            case CASH -> "Cash";
            case BOND -> "Bonds";
            case MUTUAL_FUND -> "Mutual Funds";
            default -> "Other";
        };
    }
}
