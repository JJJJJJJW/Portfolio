package com.ace.techfolio.repository;

import com.ace.techfolio.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data Repository for {@link Asset} entity.
 * All queries are scoped by userId to enforce data isolation.
 */
@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID> {

    /**
     * Find all assets belonging to a specific user.
     */
    List<Asset> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find a specific asset owned by a specific user (IDOR prevention).
     */
    Optional<Asset> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Find an asset by symbol for a specific user.
     */
    Optional<Asset> findByUserIdAndSymbolIgnoreCase(UUID userId, String symbol);

    /**
     * Find distinct symbols of all assets in positive quantity.
     */
    @Query("SELECT DISTINCT a.symbol FROM Asset a WHERE a.quantity > 0 AND a.symbol IS NOT NULL AND a.symbol != '' AND a.isCustom = false")
    List<String> findDistinctSymbolsWithPositiveQuantity();

    /**
     * Find all assets that have a positive quantity.
     */
    @Query("SELECT a FROM Asset a WHERE a.quantity > 0")
    List<Asset> findAllWithPositiveQuantity();
}
