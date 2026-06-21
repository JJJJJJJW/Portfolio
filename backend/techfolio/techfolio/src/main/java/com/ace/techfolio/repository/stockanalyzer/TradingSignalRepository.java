package com.ace.techfolio.repository.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.TradingSignal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for {@link TradingSignal} AI-generated trading signals.
 */
@Repository
public interface TradingSignalRepository extends JpaRepository<TradingSignal, UUID> {

    /** Find cached signals for a ticker analyzed after a given timestamp (same-day cache check). */
    List<TradingSignal> findBySymbolAndAnalyzedAtAfter(String symbol, LocalDateTime after);

    /** Paginated signal history, newest first. */
    Page<TradingSignal> findAllByOrderByAnalyzedAtDesc(Pageable pageable);

    /** Signal history for a specific symbol, newest first. */
    List<TradingSignal> findBySymbolOrderByAnalyzedAtDesc(String symbol, Pageable pageable);
}
