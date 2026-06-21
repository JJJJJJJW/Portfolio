package com.ace.techfolio.repository.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Watchlist} user-scoped ticker watchlist.
 */
@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {

    /** Get all watchlist entries for a specific user. */
    List<Watchlist> findAllByUserId(UUID userId);

    /** Find a specific watchlist entry for deletion. */
    Optional<Watchlist> findByUserIdAndSymbol(UUID userId, String symbol);

    /** Count how many tickers a user is watching (enforce max limit). */
    long countByUserId(UUID userId);

    /** Aggregate all unique symbols across all users' watchlists (for potential future use). */
    @Query("SELECT DISTINCT w.symbol FROM Watchlist w")
    List<String> findAllDistinctSymbols();
}
