package com.ace.techfolio.service;

import com.ace.techfolio.entity.Asset;
import com.ace.techfolio.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service that performs the nightly end-of-day portfolio snapshot.
 *
 * <p>Designed to be triggered by an external cron service (e.g. cronjob.org)
 * via a REST endpoint, rather than Spring's {@code @Scheduled} to avoid
 * background thread overhead on the 512MB Render free tier.</p>
 *
 * <p>Workflow:
 * <ol>
 *   <li>Fetch all distinct symbols from assets with positive holdings</li>
 *   <li>Batch-refresh live prices from Twelve Data / Yahoo Finance</li>
 *   <li>Update each asset's {@code current_price} and {@code current_value}</li>
 *   <li>Insert a snapshot row per user into {@code portfolio_daily_snapshots}</li>
 * </ol>
 */
@Service
public class PortfolioSnapshotService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioSnapshotService.class);

    private final AssetRepository assetRepository;
    private final MarketDataService marketDataService;
    private final JdbcTemplate jdbcTemplate;

    public PortfolioSnapshotService(AssetRepository assetRepository,
                                    MarketDataService marketDataService,
                                    JdbcTemplate jdbcTemplate) {
        this.assetRepository = assetRepository;
        this.marketDataService = marketDataService;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Executes the full EOD snapshot pipeline:
     * refresh prices → update assets → insert snapshot rows.
     *
     * @return summary message with counts
     */
    @Transactional
    public String executeSnapshot() {
        LocalDate today = LocalDate.now();
        log.info("=== EOD Snapshot started for date: {} ===", today);

        // Step 1: Get all distinct symbols with holdings
        List<String> symbols = assetRepository.findDistinctSymbolsWithPositiveQuantity();
        if (symbols.isEmpty()) {
            log.info("No assets with positive holdings found. Skipping snapshot.");
            return "No assets to snapshot.";
        }
        log.info("Found {} distinct symbols to price-refresh: {}", symbols.size(), symbols);

        // Step 2: Batch-fetch live prices from market data providers
        Map<String, Double> livePrices = marketDataService.getBatchPrices(symbols);
        log.info("Fetched {} live prices from market data providers", livePrices.size());

        // Step 3: Update each asset's current_price and current_value
        List<Asset> assets = assetRepository.findAllWithPositiveQuantity();
        int updatedCount = 0;

        for (Asset asset : assets) {
            if (asset.getSymbol() == null || asset.getSymbol().isBlank()) continue;

            String sym = asset.getSymbol().trim().toUpperCase();
            Double livePrice = livePrices.get(sym);

            if (livePrice != null && livePrice > 0.0) {
                BigDecimal newPrice = BigDecimal.valueOf(livePrice).setScale(4, RoundingMode.HALF_UP);
                asset.setCurrentPrice(newPrice);

                if (asset.getQuantity() != null) {
                    asset.setCurrentValue(asset.getQuantity().multiply(newPrice).setScale(4, RoundingMode.HALF_UP));
                }
                updatedCount++;
            }
        }

        assetRepository.saveAll(assets);
        log.info("Updated current_price for {} assets", updatedCount);

        // Step 4: Insert snapshot rows per user
        //   Aggregates total_value and total_cost per user from the refreshed assets,
        //   compares against the previous day's snapshot for daily P/L calculation.
        int snapshotCount = insertSnapshots(today);
        log.info("Inserted/updated {} user snapshot rows for {}", snapshotCount, today);

        String summary = String.format(
                "EOD Snapshot completed for %s: %d symbols refreshed, %d assets updated, %d user snapshots recorded.",
                today, livePrices.size(), updatedCount, snapshotCount
        );
        log.info("=== {} ===", summary);
        return summary;
    }

    /**
     * Inserts one snapshot row per user by aggregating their refreshed asset values.
     * Uses raw SQL with UPSERT for efficiency and to compute daily P/L in a single query.
     */
    private int insertSnapshots(LocalDate today) {
        String sql = """
                INSERT INTO portfolio_daily_snapshots (
                    id, user_id, snapshot_date,
                    total_value, total_cost,
                    daily_pl, daily_pl_pct,
                    created_at
                )
                SELECT
                    gen_random_uuid(),
                    a.user_id,
                    ?::date,
                    COALESCE(SUM(a.quantity * a.current_price), 0),
                    COALESCE(SUM(a.quantity * a.avg_price), 0),
                    COALESCE(SUM(a.quantity * a.current_price), 0) - COALESCE(prev.total_value, 0),
                    CASE
                        WHEN COALESCE(prev.total_value, 0) > 0 THEN
                            ROUND(
                                ((COALESCE(SUM(a.quantity * a.current_price), 0) - prev.total_value)
                                 / prev.total_value) * 100, 4
                            )
                        ELSE 0
                    END,
                    NOW()
                FROM assets a
                LEFT JOIN portfolio_daily_snapshots prev
                    ON prev.user_id = a.user_id
                    AND prev.snapshot_date = (?::date - INTERVAL '1 day')
                WHERE a.quantity > 0
                GROUP BY a.user_id, prev.total_value
                ON CONFLICT (user_id, snapshot_date)
                DO UPDATE SET
                    total_value  = EXCLUDED.total_value,
                    total_cost   = EXCLUDED.total_cost,
                    daily_pl     = EXCLUDED.daily_pl,
                    daily_pl_pct = EXCLUDED.daily_pl_pct,
                    created_at   = NOW()
                """;

        return jdbcTemplate.update(sql, today.toString(), today.toString());
    }
}
