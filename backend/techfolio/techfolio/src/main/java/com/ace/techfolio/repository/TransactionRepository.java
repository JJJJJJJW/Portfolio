package com.ace.techfolio.repository;

import com.ace.techfolio.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data Repository for {@link Transaction} entity.
 * All queries are scoped by userId to enforce data isolation.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /**
     * Find all transactions belonging to a specific user, newest first.
     */
    List<Transaction> findByUserIdOrderByTransactionDateDesc(UUID userId);

    /**
     * Find a specific transaction owned by a specific user (IDOR prevention).
     */
    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);
}
