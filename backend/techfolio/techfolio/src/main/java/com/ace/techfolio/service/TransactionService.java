package com.ace.techfolio.service;

import com.ace.techfolio.dto.TransactionRequest;
import com.ace.techfolio.dto.TransactionResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.Transaction;
import com.ace.techfolio.entity.enums.TransactionType;
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

    public TransactionService(TransactionRepository transactionRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
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
        return toResponse(saved);
    }

    /**
     * Deletes a transaction. Verifies ownership via userId.
     */
    @Transactional
    public void deleteTransaction(UUID userId, UUID transactionId) {
        Transaction tx = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found or access denied"));
        transactionRepository.delete(tx);
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
