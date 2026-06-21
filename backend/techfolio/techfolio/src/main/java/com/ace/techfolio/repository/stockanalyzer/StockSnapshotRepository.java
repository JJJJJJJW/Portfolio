package com.ace.techfolio.repository.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.StockSnapshot;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link StockSnapshot} daily OHLCV + indicator rows.
 */
@Repository
public interface StockSnapshotRepository extends JpaRepository<StockSnapshot, UUID> {

    /** Check if a snapshot already exists for this ticker on a given date. */
    Optional<StockSnapshot> findBySymbolAndDate(String symbol, LocalDate date);

    /** Fetch the most recent N snapshots for a ticker (ordered newest-first). */
    List<StockSnapshot> findBySymbolOrderByDateDesc(String symbol, Pageable pageable);
}
