package com.ace.techfolio.service;

import com.ace.techfolio.dto.TransactionRequest;
import com.ace.techfolio.dto.TransactionResponse;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service class for managing {@link Transaction} records.
 * All operations are scoped to the authenticated user for IDOR prevention.
 */
@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final MarketDataService marketDataService;

    public TransactionService(TransactionRepository transactionRepository, UserRepository userRepository, AssetRepository assetRepository, MarketDataService marketDataService) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
        this.marketDataService = marketDataService;
    }

    /**
     * Returns all transactions for a specific user.
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByUser(UUID userId) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a new transaction for the user.
     */
    @Transactional
    public TransactionResponse createTransaction(UUID userId, TransactionRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setType(parseType(request.type()));
        tx.setSymbol(request.symbol().trim().toUpperCase());
        tx.setQuantity(request.quantity());
        tx.setAmount(request.quantity().multiply(request.price()).setScale(4, RoundingMode.HALF_UP));
        tx.setTransactionDate(LocalDate.parse(request.date()));
        tx.setDescription(request.type().toUpperCase() + " " + request.symbol().toUpperCase());
        
        tx.setCurrency(request.currency() != null && !request.currency().isBlank() ? request.currency().toUpperCase() : "USD");
        tx.setCustom(Boolean.TRUE.equals(request.isCustom()));
        tx.setCustomExchangeRate(request.customExchangeRate());
        
        String category = request.category();
        if (category == null || category.isBlank()) {
            category = detectCategory(tx.getSymbol());
        }
        tx.setCategory(category.toUpperCase());

        Transaction saved = transactionRepository.save(tx);
        
        recalculateAssetHolding(userId, saved.getSymbol());

        if (Boolean.TRUE.equals(request.isCustom()) && request.currentPrice() != null) {
            assetRepository.findByUserIdAndSymbolIgnoreCase(userId, saved.getSymbol())
                    .ifPresent(asset -> {
                        asset.setCurrentPrice(request.currentPrice());
                        asset.setCurrentValue(asset.getQuantity().multiply(request.currentPrice()));
                        assetRepository.save(asset);
                    });
        }
        
        return toResponse(saved);
    }

    /**
     * Deletes a transaction. Verifies ownership via userId.
     */
    @Transactional
    public void deleteTransaction(UUID userId, UUID transactionId) {
        Transaction tx = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found or access denied"));
        String symbol = tx.getSymbol();
        transactionRepository.delete(tx);
        
        if (symbol != null && !symbol.isBlank()) {
            recalculateAssetHolding(userId, symbol);
        }
    }

    private void recalculateAssetHolding(UUID userId, String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return;
        }

        List<Transaction> txs = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId)
                .stream()
                .filter(t -> t.getSymbol() != null && t.getSymbol().equalsIgnoreCase(symbol))
                .toList();

        Asset asset = assetRepository.findByUserIdAndSymbolIgnoreCase(userId, symbol)
                .orElse(null);

        if (txs.isEmpty()) {
            if (asset != null) {
                assetRepository.delete(asset);
            }
            return;
        }

        // Sort chronologically ascending
        List<Transaction> chronologicalTxs = txs.stream()
                .sorted((t1, t2) -> t1.getTransactionDate().compareTo(t2.getTransactionDate()))
                .toList();

        BigDecimal qty = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal lastPrice = BigDecimal.ZERO;

        // Determine native currency of the asset
        final String assetNativeCurrency;
        if (chronologicalTxs.stream().anyMatch(Transaction::isCustom)) {
            assetNativeCurrency = chronologicalTxs.get(0).getCurrency() != null ? 
                    chronologicalTxs.get(0).getCurrency().toUpperCase() : "USD";
        } else {
            assetNativeCurrency = isBursa(symbol) ? "MYR" : "USD";
        }

        // Check if any transaction is in a different currency
        boolean needsExchangeRate = chronologicalTxs.stream()
                .anyMatch(t -> !assetNativeCurrency.equalsIgnoreCase(t.getCurrency()));

        BigDecimal usdToMyrRate = BigDecimal.valueOf(4.70); // default fallback
        if (needsExchangeRate) {
            try {
                // Fetch live exchange rate from MarketDataService
                Map<String, Double> rates = marketDataService.getBatchPrices(List.of("USD/MYR"));
                Double rate = rates.get("USD/MYR");
                if (rate != null && rate > 0.0) {
                    usdToMyrRate = BigDecimal.valueOf(rate);
                }
            } catch (Exception e) {
                log.error("Failed to fetch USD/MYR rate during holding recalculation, using fallback 4.70: {}", e.getMessage());
            }
        }

        for (Transaction t : chronologicalTxs) {
            BigDecimal tQty = t.getQuantity() != null ? t.getQuantity() : BigDecimal.ZERO;
            BigDecimal tAmt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
            String txCurrency = t.getCurrency() != null ? t.getCurrency().toUpperCase() : "USD";

            // Convert transaction amount/price to asset native currency if they differ
            BigDecimal tAmtNative = tAmt;
            if (!txCurrency.equalsIgnoreCase(assetNativeCurrency)) {
                BigDecimal currentRate = usdToMyrRate;
                if (t.getCustomExchangeRate() != null && t.getCustomExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                    currentRate = t.getCustomExchangeRate();
                }
                if (txCurrency.equals("MYR") && assetNativeCurrency.equals("USD")) {
                    // Convert MYR to USD by dividing by rate
                    tAmtNative = tAmt.divide(currentRate, 4, RoundingMode.HALF_UP);
                } else if (txCurrency.equals("USD") && assetNativeCurrency.equals("MYR")) {
                    // Convert USD to MYR by multiplying by rate
                    tAmtNative = tAmt.multiply(currentRate).setScale(4, RoundingMode.HALF_UP);
                }
            }

            BigDecimal tPrice = BigDecimal.ZERO;
            if (tQty.compareTo(BigDecimal.ZERO) > 0) {
                tPrice = tAmtNative.divide(tQty, 4, RoundingMode.HALF_UP);
                lastPrice = tPrice;
            }

            if (t.getType() == TransactionType.BUY) {
                qty = qty.add(tQty);
                totalCost = totalCost.add(tAmtNative);
            } else if (t.getType() == TransactionType.SELL) {
                if (qty.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal avgBeforeSell = totalCost.divide(qty, 4, RoundingMode.HALF_UP);
                    qty = qty.subtract(tQty);
                    if (qty.compareTo(BigDecimal.ZERO) < 0) {
                        qty = BigDecimal.ZERO;
                    }
                    totalCost = qty.multiply(avgBeforeSell);
                } else {
                    qty = BigDecimal.ZERO;
                    totalCost = BigDecimal.ZERO;
                }
            }
        }

        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            if (asset != null) {
                assetRepository.delete(asset);
            }
            return;
        }

        BigDecimal avgPrice = totalCost.divide(qty, 4, RoundingMode.HALF_UP);

        // Find the latest non-null category from the chronological transactions
        String txCategory = null;
        for (int i = chronologicalTxs.size() - 1; i >= 0; i--) {
            if (chronologicalTxs.get(i).getCategory() != null) {
                txCategory = chronologicalTxs.get(i).getCategory();
                break;
            }
        }
        if (txCategory == null) {
            txCategory = detectCategory(symbol);
        }

        if (asset == null) {
            asset = new Asset();
            asset.setUser(chronologicalTxs.get(0).getUser());
            asset.setSymbol(symbol.toUpperCase());
            asset.setName(symbol.toUpperCase());
        }
        asset.setCategory(parseAssetCategory(txCategory));
        asset.setCustom(chronologicalTxs.stream().anyMatch(Transaction::isCustom));

        asset.setQuantity(qty);
        asset.setAvgPrice(avgPrice);
        if (asset.getCurrentPrice() == null || asset.getCurrentPrice().compareTo(BigDecimal.ZERO) == 0) {
            asset.setCurrentPrice(lastPrice);
        }
        asset.setCurrentValue(qty.multiply(asset.getCurrentPrice()));
        asset.setCurrency(assetNativeCurrency);
        assetRepository.save(asset);
    }

    // =========================================================================
    // Mapping Helpers
    // =========================================================================

    private TransactionResponse toResponse(Transaction tx) {
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal price = BigDecimal.ZERO;

        if (tx.getQuantity() != null && tx.getAmount() != null && tx.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            price = tx.getAmount().divide(tx.getQuantity(), 4, RoundingMode.HALF_UP);
            totalAmount = tx.getAmount();
        } else if (tx.getAmount() != null) {
            totalAmount = tx.getAmount();
        }

        return new TransactionResponse(
                tx.getId(),
                tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : null,
                tx.getType() != null ? tx.getType().name().toLowerCase() : null,
                tx.getSymbol(),
                tx.getQuantity(),
                price.setScale(2, RoundingMode.HALF_UP),
                totalAmount.setScale(2, RoundingMode.HALF_UP),
                tx.getCurrency() != null ? tx.getCurrency().toUpperCase() : "USD",
                tx.getCategory(),
                tx.isCustom(),
                tx.getCustomExchangeRate()
        );
    }

    private TransactionType parseType(String type) {
        if (type == null || type.isBlank()) {
            return TransactionType.BUY;
        }
        try {
            return TransactionType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return TransactionType.BUY;
        }
    }

    private boolean isBursa(String symbol) {
        if (symbol == null) return false;
        String s = symbol.trim().toUpperCase();
        return s.endsWith(".KL") || s.endsWith(".KLSE") || s.endsWith(".XKLS");
    }

    private String detectCategory(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return "STOCK";
        }
        String s = symbol.trim().toUpperCase();
        if (s.endsWith(".KL") || s.endsWith(".KLSE") || s.endsWith(".XKLS")) {
            return "STOCK";
        }
        if (s.contains("/") || s.endsWith("USD") || s.equals("BTC") || s.equals("ETH") || s.equals("SOL") || s.equals("DOGE")) {
            return "CRYPTO";
        }
        return "STOCK";
    }

    private AssetCategory parseAssetCategory(String category) {
        if (category == null || category.isBlank()) {
            return AssetCategory.STOCK;
        }
        try {
            return AssetCategory.valueOf(category.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return AssetCategory.STOCK;
        }
    }
}
