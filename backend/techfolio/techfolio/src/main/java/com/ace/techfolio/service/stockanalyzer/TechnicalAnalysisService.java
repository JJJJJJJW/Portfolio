package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.StockSnapshot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.ta4j.core.BarSeries;
import org.ta4j.core.BaseBarSeriesBuilder;
import org.ta4j.core.indicators.EMAIndicator;
import org.ta4j.core.indicators.MACDIndicator;
import org.ta4j.core.indicators.RSIIndicator;
import org.ta4j.core.indicators.SMAIndicator;
import org.ta4j.core.indicators.helpers.ClosePriceIndicator;
import org.ta4j.core.num.DecimalNum;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Local technical indicator calculation using the ta4j library.
 *
 * <p>All computation happens in-memory — zero API calls. Converts
 * Polygon.io OHLCV bar data into a ta4j {@link BarSeries}, then
 * calculates RSI(14), SMA(50), SMA(200), and MACD(12,26,9).</p>
 *
 * <p>Returns a populated {@link StockSnapshot} for the most recent
 * trading day with all indicator values filled in.</p>
 */
@Service
public class TechnicalAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(TechnicalAnalysisService.class);

    /**
     * Builds a StockSnapshot with calculated technical indicators from OHLCV bar data.
     *
     * @param symbol the ticker symbol
     * @param bars   OHLCV bars from Polygon (must be sorted ascending by date)
     * @return a StockSnapshot with indicators, or null if insufficient data
     */
    public StockSnapshot calculateIndicators(String symbol, List<PolygonService.OhlcvBar> bars) {
        if (bars == null || bars.size() < 14) {
            log.warn("Insufficient bar data for {} ({} bars). Need at least 14.", symbol,
                    bars != null ? bars.size() : 0);
            return null;
        }

        try {
            // Build ta4j bar series
            BarSeries series = new BaseBarSeriesBuilder()
                    .withName(symbol)
                    .withNumTypeOf(DecimalNum.class)
                    .build();

            for (PolygonService.OhlcvBar bar : bars) {
                if (bar.getDate() == null || bar.getClose() == null) continue;

                ZonedDateTime zdt = bar.getDate().atStartOfDay(ZoneId.of("America/New_York"));
                series.addBar(
                        zdt,
                        bar.getOpen() != null ? bar.getOpen().doubleValue() : bar.getClose().doubleValue(),
                        bar.getHigh() != null ? bar.getHigh().doubleValue() : bar.getClose().doubleValue(),
                        bar.getLow() != null ? bar.getLow().doubleValue() : bar.getClose().doubleValue(),
                        bar.getClose().doubleValue(),
                        bar.getVolume() != null ? bar.getVolume() : 0
                );
            }

            int lastIndex = series.getEndIndex();
            if (lastIndex < 0) {
                log.warn("Empty series after building bars for {}", symbol);
                return null;
            }

            ClosePriceIndicator closePrice = new ClosePriceIndicator(series);

            // RSI(14)
            Double rsi14 = null;
            if (series.getBarCount() >= 15) {
                RSIIndicator rsi = new RSIIndicator(closePrice, 14);
                rsi14 = rsi.getValue(lastIndex).doubleValue();
            }

            // SMA(50)
            BigDecimal sma50 = null;
            if (series.getBarCount() >= 50) {
                SMAIndicator sma = new SMAIndicator(closePrice, 50);
                sma50 = BigDecimal.valueOf(sma.getValue(lastIndex).doubleValue())
                        .setScale(4, RoundingMode.HALF_UP);
            }

            // SMA(200)
            BigDecimal sma200 = null;
            if (series.getBarCount() >= 200) {
                SMAIndicator sma = new SMAIndicator(closePrice, 200);
                sma200 = BigDecimal.valueOf(sma.getValue(lastIndex).doubleValue())
                        .setScale(4, RoundingMode.HALF_UP);
            }

            // MACD(12, 26, 9)
            Double macdLine = null;
            Double macdSignal = null;
            Double macdHistogram = null;
            if (series.getBarCount() >= 26) {
                MACDIndicator macd = new MACDIndicator(closePrice, 12, 26);
                EMAIndicator signalLine = new EMAIndicator(macd, 9);

                macdLine = macd.getValue(lastIndex).doubleValue();
                macdSignal = signalLine.getValue(lastIndex).doubleValue();
                macdHistogram = macdLine - macdSignal;
            }

            // Build the snapshot
            PolygonService.OhlcvBar latestBar = bars.get(bars.size() - 1);
            StockSnapshot snap = new StockSnapshot();
            snap.setSymbol(symbol);
            snap.setDate(latestBar.getDate() != null ? latestBar.getDate() : LocalDate.now());
            snap.setOpen(latestBar.getOpen());
            snap.setHigh(latestBar.getHigh());
            snap.setLow(latestBar.getLow());
            snap.setClose(latestBar.getClose());
            snap.setVolume(latestBar.getVolume());
            snap.setRsi14(rsi14);
            snap.setSma50(sma50);
            snap.setSma200(sma200);
            snap.setMacdLine(macdLine);
            snap.setMacdSignal(macdSignal);
            snap.setMacdHistogram(macdHistogram);

            log.debug("Calculated indicators for {}: RSI={}, SMA50={}, SMA200={}, MACD={}/{}",
                    symbol, rsi14, sma50, sma200, macdLine, macdSignal);

            return snap;

        } catch (Exception e) {
            log.error("Failed to calculate indicators for {}: {}", symbol, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Quick screening check: does this ticker pass the basic filters?
     *
     * @param bars       OHLCV bars (need 200+ for SMA200)
     * @param rsiMin     min RSI threshold
     * @param rsiMax     max RSI threshold
     * @param minVolume  minimum average volume
     * @param requireAboveSma200 whether price must be above 200-SMA
     * @return true if the ticker passes all screening filters
     */
    public boolean passesScreeningFilters(List<PolygonService.OhlcvBar> bars,
                                           int rsiMin, int rsiMax,
                                           long minVolume,
                                           boolean requireAboveSma200) {
        if (bars == null || bars.size() < 15) return false;

        try {
            BarSeries series = new BaseBarSeriesBuilder()
                    .withName("screening")
                    .withNumTypeOf(DecimalNum.class)
                    .build();

            for (PolygonService.OhlcvBar bar : bars) {
                if (bar.getDate() == null || bar.getClose() == null) continue;
                ZonedDateTime zdt = bar.getDate().atStartOfDay(ZoneId.of("America/New_York"));
                series.addBar(zdt,
                        bar.getOpen() != null ? bar.getOpen().doubleValue() : bar.getClose().doubleValue(),
                        bar.getHigh() != null ? bar.getHigh().doubleValue() : bar.getClose().doubleValue(),
                        bar.getLow() != null ? bar.getLow().doubleValue() : bar.getClose().doubleValue(),
                        bar.getClose().doubleValue(),
                        bar.getVolume() != null ? bar.getVolume() : 0);
            }

            int lastIndex = series.getEndIndex();
            if (lastIndex < 14) return false;

            ClosePriceIndicator closePrice = new ClosePriceIndicator(series);

            // RSI filter
            RSIIndicator rsi = new RSIIndicator(closePrice, 14);
            double rsiValue = rsi.getValue(lastIndex).doubleValue();
            if (rsiValue < rsiMin || rsiValue > rsiMax) return false;

            // Volume filter (average of last 20 days)
            long avgVol = 0;
            int volCount = 0;
            for (int i = Math.max(0, lastIndex - 19); i <= lastIndex; i++) {
                long vol = series.getBar(i).getVolume().longValue();
                avgVol += vol;
                volCount++;
            }
            if (volCount > 0) avgVol /= volCount;
            if (avgVol < minVolume) return false;

            // SMA(200) filter
            if (requireAboveSma200 && series.getBarCount() >= 200) {
                SMAIndicator sma200 = new SMAIndicator(closePrice, 200);
                double currentPrice = closePrice.getValue(lastIndex).doubleValue();
                double sma200Value = sma200.getValue(lastIndex).doubleValue();
                if (currentPrice <= sma200Value) return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Screening filter error: {}", e.getMessage());
            return false;
        }
    }
}
