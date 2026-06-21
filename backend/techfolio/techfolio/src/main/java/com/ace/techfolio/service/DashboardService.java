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
import com.ace.techfolio.dto.DailyPLResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
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

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    private final AssetRepository assetRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final MarketDataService marketDataService;
    private final JdbcTemplate jdbcTemplate;

    public DashboardService(AssetRepository assetRepository,
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            MarketDataService marketDataService,
            JdbcTemplate jdbcTemplate) {
        this.assetRepository = assetRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.marketDataService = marketDataService;
        this.jdbcTemplate = jdbcTemplate;
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

        // Fetch real daily snapshots to eliminate simulated chart mock values
        LocalDate earliestSnapshotDate = YearMonth.now().minusMonths(11).atDay(1);
        String snapshotsSql = "SELECT total_value, snapshot_date FROM portfolio_daily_snapshots WHERE user_id = ? AND snapshot_date >= ?";
        Map<LocalDate, BigDecimal> snapshotMap = new HashMap<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(snapshotsSql, userId, earliestSnapshotDate);
            for (Map<String, Object> row : rows) {
                java.sql.Date sqlDate = (java.sql.Date) row.get("snapshot_date");
                BigDecimal totalValue = (BigDecimal) row.get("total_value");
                if (sqlDate != null && totalValue != null) {
                    snapshotMap.put(sqlDate.toLocalDate(), totalValue);
                }
            }
        } catch (Exception e) {
            log.error("Failed to query portfolio daily snapshots: {}", e.getMessage());
        }

        // Fetch live prices for non-custom assets to avoid database lag
        List<String> symbols = assets.stream()
                .filter(a -> !a.isCustom() && a.getCategory() != AssetCategory.OTHER)
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
            if (!asset.isCustom() && asset.getSymbol() != null
                    && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
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

        // 2. Realised P/L calculation & Win rate statistics
        RealisedPLDetails realisedDetails = calculateRealisedPLDetails(transactions, baseCurrency, usdToMyrRate);
        BigDecimal realisedPL = realisedDetails.realisedPL();
        int profitableSells = realisedDetails.profitableSells();
        int totalSells = realisedDetails.totalSells();
        BigDecimal tradeWinRate = realisedDetails.winRate();

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
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0)
                continue;

            BigDecimal currentPrice = asset.getCurrentPrice();
            if (!asset.isCustom() && asset.getSymbol() != null
                    && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
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

        // 4b. Currency distribution percentages
        Map<String, BigDecimal> currencyValues = new HashMap<>();
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

            currencyValues.put(assetCurrency, currencyValues.getOrDefault(assetCurrency, BigDecimal.ZERO).add(convertedVal));
        }

        List<String> currencyDistributionLabels = new ArrayList<>();
        List<Double> currencyDistributionSeries = new ArrayList<>();

        if (portfolioValue.compareTo(BigDecimal.ZERO) > 0) {
            for (Map.Entry<String, BigDecimal> entry : currencyValues.entrySet()) {
                currencyDistributionLabels.add(entry.getKey());
                double percentage = entry.getValue()
                        .divide(portfolioValue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
                currencyDistributionSeries.add(percentage);
            }
        } else {
            currencyDistributionLabels.add("No Assets Yet");
            currencyDistributionSeries.add(100.0);
        }

        // 5. Daily Portfolio Trend (Last 7 days)
        List<String> dailyCategories = new ArrayList<>();
        List<BigDecimal> dailySeries = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter dailyFormatter = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            dailyCategories.add(date.format(dailyFormatter));
            BigDecimal valAtDate = getPortfolioValueAtDate(userId, date, assets, transactions, usdToMyrRate,
                    baseCurrency, livePrices, snapshotMap);
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
            BigDecimal valAtDate = getPortfolioValueAtDate(userId, endOfMonth, assets, transactions, usdToMyrRate,
                    baseCurrency, livePrices, snapshotMap);
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

        // 7. Find top and worst performers from active holdings
        Asset topAsset = null;
        BigDecimal topVal = BigDecimal.ZERO;
        BigDecimal topPct = BigDecimal.valueOf(-Double.MAX_VALUE);

        Asset worstAsset = null;
        BigDecimal worstVal = BigDecimal.ZERO;
        BigDecimal worstPct = BigDecimal.valueOf(Double.MAX_VALUE);

        for (Asset asset : assets) {
            BigDecimal qty = asset.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0)
                continue;

            BigDecimal currentPrice = asset.getCurrentPrice();
            if (!asset.isCustom() && asset.getSymbol() != null
                    && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
                Double livePrice = livePrices.get(asset.getSymbol().toUpperCase());
                if (livePrice != null && livePrice > 0.0) {
                    currentPrice = BigDecimal.valueOf(livePrice);
                }
            }
            if (currentPrice == null) {
                currentPrice = BigDecimal.ZERO;
            }

            BigDecimal avgPrice = asset.getAvgPrice() != null ? asset.getAvgPrice() : BigDecimal.ZERO;
            BigDecimal plInAsset = currentPrice.subtract(avgPrice).multiply(qty);
            String assetCurrency = asset.getCurrency() != null ? asset.getCurrency().toUpperCase() : "USD";
            BigDecimal plInBase = convertCurrency(plInAsset, assetCurrency, baseCurrency, usdToMyrRate);

            BigDecimal plPct = BigDecimal.ZERO;
            if (avgPrice.compareTo(BigDecimal.ZERO) > 0) {
                plPct = currentPrice.subtract(avgPrice)
                        .divide(avgPrice, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }

            if (plPct.compareTo(topPct) > 0) {
                topPct = plPct;
                topAsset = asset;
                topVal = plInBase;
            }
            if (plPct.compareTo(worstPct) < 0) {
                worstPct = plPct;
                worstAsset = asset;
                worstVal = plInBase;
            }
        }

        // De-duplicate if only one asset exists or if both references point to the same asset
        if (topAsset != null && topAsset == worstAsset) {
            if (topPct.compareTo(BigDecimal.ZERO) >= 0) {
                worstAsset = null;
            } else {
                topAsset = null;
            }
        }

        String topPerformerSymbol = topAsset != null ? topAsset.getSymbol() : null;
        BigDecimal topPerformerPct = topAsset != null ? topPct : null;
        BigDecimal topPerformerVal = topAsset != null ? topVal : null;

        String worstPerformerSymbol = worstAsset != null ? worstAsset.getSymbol() : null;
        BigDecimal worstPerformerPct = worstAsset != null ? worstPct : null;
        BigDecimal worstPerformerVal = worstAsset != null ? worstVal : null;

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
                baseCurrency,
                topPerformerSymbol,
                topPerformerPct != null ? topPerformerPct.setScale(2, RoundingMode.HALF_UP) : null,
                topPerformerVal != null ? topPerformerVal.setScale(2, RoundingMode.HALF_UP) : null,
                worstPerformerSymbol,
                worstPerformerPct != null ? worstPerformerPct.setScale(2, RoundingMode.HALF_UP) : null,
                worstPerformerVal != null ? worstPerformerVal.setScale(2, RoundingMode.HALF_UP) : null,
                tradeWinRate.setScale(2, RoundingMode.HALF_UP),
                profitableSells,
                totalSells,
                currencyDistributionLabels,
                currencyDistributionSeries
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

    private record RealisedPLDetails(
            BigDecimal realisedPL,
            int profitableSells,
            int totalSells,
            BigDecimal winRate) {
    }

    private RealisedPLDetails calculateRealisedPLDetails(List<Transaction> transactions, String baseCurrency,
            BigDecimal usdToMyrRate) {
        List<Transaction> chronologicalTxs = transactions.stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate))
                .toList();

        Map<String, BigDecimal> runningQtyMap = new HashMap<>();
        Map<String, BigDecimal> runningTotalCostBasisMap = new HashMap<>();

        BigDecimal totalRealisedPL = BigDecimal.ZERO;
        int totalSells = 0;
        int profitableSells = 0;

        for (Transaction t : chronologicalTxs) {
            String symbol = t.getSymbol();
            if (symbol == null || symbol.isBlank())
                continue;
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

                    totalSells++;
                    if (realisedPLForSell.compareTo(BigDecimal.ZERO) > 0) {
                        profitableSells++;
                    }

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

        BigDecimal winRate = BigDecimal.ZERO;
        if (totalSells > 0) {
            winRate = BigDecimal.valueOf(profitableSells)
                    .divide(BigDecimal.valueOf(totalSells), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return new RealisedPLDetails(totalRealisedPL, profitableSells, totalSells, winRate);
    }

    private BigDecimal getPortfolioValueAtDate(UUID userId, LocalDate date, List<Asset> assets,
            List<Transaction> transactions, BigDecimal usdToMyrRate, String baseCurrency,
            Map<String, Double> livePrices, Map<LocalDate, BigDecimal> snapshotMap) {
        if (snapshotMap != null && snapshotMap.containsKey(date)) {
            return snapshotMap.get(date).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal totalValue = BigDecimal.ZERO;

        for (Asset asset : assets) {
            String symbol = asset.getSymbol();
            if (symbol == null || symbol.isBlank())
                continue;

            BigDecimal qty = BigDecimal.ZERO;
            for (Transaction t : transactions) {
                if (t.getSymbol() != null && t.getSymbol().equalsIgnoreCase(symbol)
                        && !t.getTransactionDate().isAfter(date)) {
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
                if (!asset.isCustom() && asset.getSymbol() != null
                        && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
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
                BigDecimal valueInBaseCurrency = convertCurrency(valueInAssetCurrency, assetCurrency, baseCurrency,
                        usdToMyrRate);

                totalValue = totalValue.add(valueInBaseCurrency);
            }
        }

        return totalValue.setScale(2, RoundingMode.HALF_UP);
    }

    private String formatCategoryLabel(AssetCategory category) {
        if (category == null)
            return "Other";
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

    private Map<LocalDate, BigDecimal> calculateRealizedPLByDate(List<Transaction> transactions, String baseCurrency, BigDecimal usdToMyrRate) {
        List<Transaction> chronologicalTxs = transactions.stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate))
                .toList();

        Map<String, BigDecimal> runningQtyMap = new HashMap<>();
        Map<String, BigDecimal> runningTotalCostBasisMap = new HashMap<>();
        Map<LocalDate, BigDecimal> realizedPLByDate = new HashMap<>();

        for (Transaction t : chronologicalTxs) {
            String symbol = t.getSymbol();
            if (symbol == null || symbol.isBlank())
                continue;
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

                    LocalDate txDate = t.getTransactionDate();
                    realizedPLByDate.put(txDate, realizedPLByDate.getOrDefault(txDate, BigDecimal.ZERO).add(realisedPLForSell));

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
        return realizedPLByDate;
    }

    @Transactional(readOnly = true)
    public List<DailyPLResponse> getDailyPLCalendar(UUID userId) {
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

        // Fetch user transactions
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
        Map<LocalDate, BigDecimal> realizedPLByDate = calculateRealizedPLByDate(transactions, baseCurrency, usdToMyrRate);

        String sql = """
                SELECT snapshot_date::text, daily_pl, daily_pl_pct, total_value, total_cost
                FROM portfolio_daily_snapshots
                WHERE user_id = ?
                ORDER BY snapshot_date ASC
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, userId);
        List<DailyPLResponse> response = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            String dateStr = (String) row.get("snapshot_date");
            if (dateStr == null) continue;

            LocalDate localDate;
            try {
                localDate = LocalDate.parse(dateStr.substring(0, 10));
            } catch (Exception e) {
                localDate = LocalDate.parse(dateStr);
            }

            BigDecimal dailyPLRaw = (BigDecimal) row.get("daily_pl");
            BigDecimal dailyPLPctRaw = (BigDecimal) row.get("daily_pl_pct");
            BigDecimal totalValueRaw = (BigDecimal) row.get("total_value");
            BigDecimal totalCostRaw = (BigDecimal) row.get("total_cost");

            double dailyPL = dailyPLRaw != null ? dailyPLRaw.doubleValue() : 0.0;
            double dailyPLPct = dailyPLPctRaw != null ? dailyPLPctRaw.doubleValue() : 0.0;
            double totalValue = totalValueRaw != null ? totalValueRaw.doubleValue() : 0.0;
            double totalCost = totalCostRaw != null ? totalCostRaw.doubleValue() : 0.0;

            // First day override check
            if (i == 0) {
                dailyPL = totalValue - totalCost;
                dailyPLPct = totalCost > 0 ? (dailyPL / totalCost) * 100.0 : 0.0;
            }

            BigDecimal realizedPLVal = realizedPLByDate.getOrDefault(localDate, BigDecimal.ZERO);
            double realizedPL = realizedPLVal.doubleValue();
            double unrealizedPL = dailyPL - realizedPL;

            response.add(new DailyPLResponse(
                    dateStr,
                    safeRound(dailyPL, 2),
                    safeRound(dailyPLPct, 4),
                    safeRound(realizedPL, 2),
                    safeRound(unrealizedPL, 2)
            ));
        }

        return response;
    }

    private double safeRound(double val, int scale) {
        if (Double.isNaN(val) || Double.isInfinite(val)) {
            return 0.0;
        }
        return BigDecimal.valueOf(val).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }
}
