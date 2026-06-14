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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service class for managing {@link Transaction} records.
 * All operations are scoped to the authenticated user for IDOR prevention.
 */
@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;

    public TransactionService(TransactionRepository transactionRepository, UserRepository userRepository, AssetRepository assetRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
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

        Transaction saved = transactionRepository.save(tx);
        
        recalculateAssetHolding(userId, saved.getSymbol());
        
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

        for (Transaction t : chronologicalTxs) {
            BigDecimal tQty = t.getQuantity() != null ? t.getQuantity() : BigDecimal.ZERO;
            BigDecimal tAmt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;

            BigDecimal tPrice = BigDecimal.ZERO;
            if (tQty.compareTo(BigDecimal.ZERO) > 0) {
                tPrice = tAmt.divide(tQty, 4, RoundingMode.HALF_UP);
                lastPrice = tPrice;
            }

            if (t.getType() == TransactionType.BUY) {
                qty = qty.add(tQty);
                totalCost = totalCost.add(tAmt);
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

        if (asset == null) {
            asset = new Asset();
            asset.setUser(chronologicalTxs.get(0).getUser());
            asset.setSymbol(symbol.toUpperCase());
            asset.setName(symbol.toUpperCase());
            asset.setCategory(AssetCategory.STOCK);
        }

        asset.setQuantity(qty);
        asset.setAvgPrice(avgPrice);
        if (asset.getCurrentPrice() == null || asset.getCurrentPrice().compareTo(BigDecimal.ZERO) == 0) {
            asset.setCurrentPrice(lastPrice);
        }
        asset.setCurrentValue(qty.multiply(asset.getCurrentPrice()));
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
                totalAmount.setScale(2, RoundingMode.HALF_UP)
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
}
