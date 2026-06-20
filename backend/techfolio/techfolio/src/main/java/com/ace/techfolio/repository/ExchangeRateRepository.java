package com.ace.techfolio.repository;

import com.ace.techfolio.entity.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, UUID> {

    /**
     * Find the single latest ExchangeRate entry for a given currency pair symbol,
     * ordered by the fetched timestamp descending.
     */
    Optional<ExchangeRate> findFirstBySymbolOrderByFetchedAtDesc(String symbol);
}
