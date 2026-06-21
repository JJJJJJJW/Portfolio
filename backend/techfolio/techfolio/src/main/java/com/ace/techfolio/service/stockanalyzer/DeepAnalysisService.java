package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.FundamentalData;
import com.ace.techfolio.entity.stockanalyzer.MacroSnapshot;
import com.ace.techfolio.entity.stockanalyzer.StockSnapshot;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;
import com.ace.techfolio.repository.stockanalyzer.FundamentalDataRepository;
import com.ace.techfolio.repository.stockanalyzer.MacroSnapshotRepository;
import com.ace.techfolio.repository.stockanalyzer.StockSnapshotRepository;
import com.ace.techfolio.repository.stockanalyzer.TradingSignalRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Stage 2 of the two-stage pipeline: Deep Analysis.
 *
 * <p>For each candidate ticker from screening, this service:</p>
 * <ol>
 *   <li>Fetches 60 days of OHLCV data from Polygon (rate-limited)</li>
 *   <li>Calculates technical indicators via ta4j</li>
 *   <li>Fetches/refreshes company fundamentals from Finnhub</li>
 *   <li>Fetches/refreshes macro context from FRED</li>
 *   <li>Fetches recent news from Finnhub</li>
 *   <li>Sends structured prompt to OpenAI GPT-4o-mini</li>
 *   <li>Saves the resulting TradingSignal to the database</li>
 * </ol>
 *
 * <p>Caching: skips re-analysis if a signal for the same ticker was
 * generated today (unless data has changed).</p>
 */
@Service
public class DeepAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(DeepAnalysisService.class);

    private final PolygonService polygonService;
    private final FinnhubService finnhubService;
    private final FredService fredService;
    private final OpenAIService openAIService;
    private final TechnicalAnalysisService technicalAnalysisService;
    private final StockSnapshotRepository snapshotRepo;
    private final FundamentalDataRepository fundamentalRepo;
    private final MacroSnapshotRepository macroRepo;
    private final TradingSignalRepository signalRepo;

    public DeepAnalysisService(PolygonService polygonService,
                                FinnhubService finnhubService,
                                FredService fredService,
                                OpenAIService openAIService,
                                TechnicalAnalysisService technicalAnalysisService,
                                StockSnapshotRepository snapshotRepo,
                                FundamentalDataRepository fundamentalRepo,
                                MacroSnapshotRepository macroRepo,
                                TradingSignalRepository signalRepo) {
        this.polygonService = polygonService;
        this.finnhubService = finnhubService;
        this.fredService = fredService;
        this.openAIService = openAIService;
        this.technicalAnalysisService = technicalAnalysisService;
        this.snapshotRepo = snapshotRepo;
        this.fundamentalRepo = fundamentalRepo;
        this.macroRepo = macroRepo;
        this.signalRepo = signalRepo;
    }

    /**
     * Performs deep analysis for a single ticker.
     *
     * @param symbol       the ticker to analyze
     * @param riskAppetite the requesting user's risk appetite (null for cron pipeline)
     * @return the generated TradingSignal, or null on critical failure
     */
    public TradingSignal analyzeSymbol(String symbol, String riskAppetite) {
        log.info("Deep analysis started for {}", symbol);

        // 1. Check same-day cache
        LocalDateTime todayStart = LocalDate.now().atTime(LocalTime.MIDNIGHT);
        List<TradingSignal> cached = signalRepo.findBySymbolAndAnalyzedAtAfter(
                symbol.toUpperCase(), todayStart);
        if (!cached.isEmpty()) {
            log.info("Using cached signal for {} (analyzed today at {})", symbol,
                    cached.get(0).getAnalyzedAt());
            return cached.get(0);
        }

        // 2. Fetch 60 days OHLCV from Polygon (rate-limited)
        List<PolygonService.OhlcvBar> bars = polygonService.fetchDailyBars(symbol, 90);
        // Fetch extended data for better indicator accuracy

        // 3. Calculate technical indicators
        StockSnapshot snapshot = technicalAnalysisService.calculateIndicators(symbol, bars);
        if (snapshot == null) {
            log.error("Failed to calculate indicators for {}. Aborting analysis.", symbol);
            return null;
        }

        // Save snapshot
        try {
            Optional<StockSnapshot> existing = snapshotRepo.findBySymbolAndDate(
                    symbol.toUpperCase(), snapshot.getDate());
            if (existing.isEmpty()) {
                snapshotRepo.save(snapshot);
            }
        } catch (Exception e) {
            log.warn("Failed to save snapshot for {}: {}", symbol, e.getMessage());
        }

        // 4. Fetch/refresh fundamentals from Finnhub
        FundamentalData fundamentals = fetchOrRefreshFundamentals(symbol);

        // 5. Fetch/refresh macro context from FRED
        MacroSnapshot macro = fetchOrRefreshMacro();

        // 6. Fetch recent news from Finnhub
        List<String> news = finnhubService.fetchCompanyNews(symbol, 7);

        // 7. Call OpenAI for analysis (with risk appetite from user profile)
        TradingSignal signal = openAIService.analyzeStock(
                symbol, snapshot, fundamentals, macro, news, riskAppetite);

        // 8. Save signal to DB
        if (signal != null) {
            try {
                signalRepo.save(signal);
                log.info("Deep analysis complete for {}: signal={}, confidence={}",
                        symbol, signal.getSignal(), signal.getConfidence());
            } catch (Exception e) {
                log.error("Failed to save signal for {}: {}", symbol, e.getMessage());
            }
        }

        return signal;
    }

    // =========================================================================
    // Fundamentals Refresh Logic
    // =========================================================================

    private FundamentalData fetchOrRefreshFundamentals(String symbol) {
        try {
            Optional<FundamentalData> existing = fundamentalRepo.findBySymbol(symbol.toUpperCase());

            // Refresh if not found or older than 24 hours
            if (existing.isPresent() &&
                existing.get().getUpdatedAt().isAfter(LocalDateTime.now().minusHours(24))) {
                log.debug("Using cached fundamentals for {}", symbol);
                return existing.get();
            }

            // Fetch from Finnhub
            FinnhubService.CompanyProfile profile = finnhubService.fetchCompanyProfile(symbol);
            FinnhubService.BasicFinancials financials = finnhubService.fetchBasicFinancials(symbol);

            FundamentalData fund = existing.orElse(new FundamentalData());
            fund.setSymbol(symbol.toUpperCase());
            fund.setSector(profile.getSector());
            fund.setMarketCap(profile.getMarketCap());
            fund.setPeRatio(financials.getPeRatio());
            fund.setEpsGrowthYoY(financials.getEpsGrowthYoY());
            fund.setRevenueGrowthYoY(financials.getRevenueGrowthYoY());
            fund.setDebtToEquity(financials.getDebtToEquity());
            fund.setHigh52Week(financials.getHigh52Week());
            fund.setLow52Week(financials.getLow52Week());
            fund.setAvgVolume(financials.getAvgVolume());
            fund.setUpdatedAt(LocalDateTime.now());

            fundamentalRepo.save(fund);
            log.debug("Refreshed fundamentals for {}", symbol);
            return fund;

        } catch (Exception e) {
            log.warn("Failed to fetch fundamentals for {}: {}", symbol, e.getMessage());
            return fundamentalRepo.findBySymbol(symbol.toUpperCase()).orElse(null);
        }
    }

    // =========================================================================
    // Macro Refresh Logic
    // =========================================================================

    private MacroSnapshot fetchOrRefreshMacro() {
        try {
            Optional<MacroSnapshot> existing = macroRepo.findByDate(LocalDate.now());
            if (existing.isPresent()) {
                log.debug("Using cached macro snapshot for today");
                return existing.get();
            }

            MacroSnapshot macro = fredService.fetchMacroSnapshot();
            macroRepo.save(macro);
            log.debug("Saved new macro snapshot for today");
            return macro;

        } catch (Exception e) {
            log.warn("Failed to fetch macro data: {}. Using latest available.", e.getMessage());
            return macroRepo.findTopByOrderByDateDesc().orElse(null);
        }
    }
}
