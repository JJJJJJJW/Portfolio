package com.ace.techfolio.repository.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.FundamentalData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link FundamentalData} company fundamentals.
 */
@Repository
public interface FundamentalDataRepository extends JpaRepository<FundamentalData, UUID> {

    /** Find the latest fundamentals for a ticker (one row per symbol). */
    Optional<FundamentalData> findBySymbol(String symbol);
}
