package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.config.StockAnalyzerProperties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Stage 1 of the two-stage pipeline: Screening.
 *
 * <p>Runs daily (triggered by cron). Fetches top movers from Polygon.io,
 * then applies technical filters to produce 20-30 candidate tickers for
 * deep analysis.</p>
 *
 * <p>Filters applied:</p>
 * <ul>
 *   <li>Price above 200-day SMA (uptrend confirmation)</li>
 *   <li>RSI(14) between 30-55 (not overbought)</li>
 *   <li>Average volume greater than 500K (liquidity)</li>
 * </ul>
 *
 * <p>Per user request: only Polygon top movers are used for screening.
 * User watchlists are separate (for on-demand analysis only).</p>
 */
@Service
public class ScreeningService {

    private static final Logger log = LoggerFactory.getLogger(ScreeningService.class);

    private final PolygonService polygonService;
    private final TechnicalAnalysisService technicalAnalysisService;
    private final StockAnalyzerProperties props;

    public ScreeningService(PolygonService polygonService,
                             TechnicalAnalysisService technicalAnalysisService,
                             StockAnalyzerProperties props) {
        this.polygonService = polygonService;
        this.technicalAnalysisService = technicalAnalysisService;
        this.props = props;
    }

    /**
     * Executes Stage 1 screening: fetch top movers, apply filters.
     *
     * @return list of candidate ticker symbols that pass all filters (max ~30)
     */
    public List<String> screenCandidates() {
        log.info("=== Stage 1: Screening started ===");

        // 1. Fetch top movers from Polygon
        List<String> topMovers = polygonService.fetchTopMovers();
        log.info("Fetched {} top movers from Polygon", topMovers.size());

        if (topMovers.isEmpty()) {
            log.warn("No top movers returned from Polygon. Screening aborted.");
            return new ArrayList<>();
        }

        // 2. Apply technical filters to each candidate
        List<String> candidates = new ArrayList<>();
        int maxCandidates = 30;

        for (String ticker : topMovers) {
            if (candidates.size() >= maxCandidates) {
                log.info("Reached max candidate limit of {}. Stopping screening.", maxCandidates);
                break;
            }

            try {
                // Fetch enough bars for 200-SMA calculation (~280 calendar days ≈ 200 trading days)
                List<PolygonService.OhlcvBar> bars = polygonService.fetchDailyBars(ticker, 280);

                if (bars.isEmpty()) {
                    log.debug("No bar data for {} — skipping", ticker);
                    continue;
                }

                boolean passes = technicalAnalysisService.passesScreeningFilters(
                        bars,
                        props.getScreening().getRsiMin(),
                        props.getScreening().getRsiMax(),
                        props.getScreening().getMinVolume(),
                        props.getScreening().isRequireAbove200Sma()
                );

                if (passes) {
                    candidates.add(ticker);
                    log.debug("{} passed screening filters", ticker);
                } else {
                    log.debug("{} did not pass screening filters", ticker);
                }
            } catch (Exception e) {
                log.warn("Error screening ticker {}: {}", ticker, e.getMessage());
            }
        }

        log.info("=== Stage 1 complete: {} candidates passed out of {} top movers ===",
                candidates.size(), topMovers.size());

        return candidates;
    }
}
