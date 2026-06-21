package com.ace.techfolio.service.stockanalyzer;

import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.entity.stockanalyzer.FundamentalData;
import com.ace.techfolio.entity.stockanalyzer.MacroSnapshot;
import com.ace.techfolio.entity.stockanalyzer.StockSnapshot;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * OpenAI API client for GPT-4o-mini stock analysis.
 *
 * <p>Sends structured prompts with technical, fundamental, macro, and
 * sentiment data. Parses the JSON response into a {@link TradingSignal}.
 * Retries once on JSON parse failure as specified.</p>
 *
 * <p>When called from an authenticated user context, the user's
 * {@code riskAppetite} from their profile is injected into the system
 * prompt to personalize the analysis.</p>
 */
@Service
public class OpenAIService {

    private static final Logger log = LoggerFactory.getLogger(OpenAIService.class);
    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    private final StockAnalyzerProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OpenAIService(StockAnalyzerProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Analyzes a stock and returns a trading signal.
     *
     * @param symbol       the ticker symbol
     * @param snapshot      latest stock snapshot with technical indicators
     * @param fundamentals  company fundamentals (nullable — partial data allowed)
     * @param macro         macro environment snapshot (nullable)
     * @param newsHeadlines recent news summaries
     * @param riskAppetite  the user's risk appetite from their profile (nullable for cron runs)
     * @return parsed TradingSignal, or a HOLD signal on failure
     */
    public TradingSignal analyzeStock(String symbol,
                                       StockSnapshot snapshot,
                                       FundamentalData fundamentals,
                                       MacroSnapshot macro,
                                       List<String> newsHeadlines,
                                       String riskAppetite) {

        String systemPrompt = buildSystemPrompt(riskAppetite);
        String userPrompt = buildUserPrompt(symbol, snapshot, fundamentals, macro, newsHeadlines);

        // Attempt analysis with one retry on JSON parse failure
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = callOpenAI(systemPrompt, userPrompt);
                return parseResponse(response, symbol);
            } catch (JsonProcessingException e) {
                log.warn("Attempt {}/2: Failed to parse OpenAI JSON for {}: {}", attempt, symbol, e.getMessage());
                if (attempt == 2) {
                    log.error("Both attempts failed for {}. Returning default HOLD signal.", symbol);
                    return buildDefaultHoldSignal(symbol);
                }
            } catch (Exception e) {
                log.error("OpenAI API call failed for {}: {}", symbol, e.getMessage());
                return buildDefaultHoldSignal(symbol);
            }
        }

        return buildDefaultHoldSignal(symbol);
    }

    // =========================================================================
    // System Prompt
    // =========================================================================

    private String buildSystemPrompt(String riskAppetite) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a quantitative trading analyst specializing in US equities position trading ");
        sb.append("(2-8 week holding period). You analyze technical, fundamental, macro, and sentiment ");
        sb.append("data to generate trading signals.\n\n");

        // Inject user's risk appetite if available
        if (riskAppetite != null && !riskAppetite.isBlank()) {
            sb.append("IMPORTANT — INVESTOR RISK PROFILE: The investor's risk appetite is \"")
              .append(riskAppetite)
              .append("\". Calibrate your signal confidence, entry/exit targets, and recommendations ")
              .append("accordingly. For conservative investors, be more selective and widen stop-losses. ")
              .append("For aggressive investors, consider higher-conviction setups with tighter risk management.\n\n");
        }

        sb.append("Rules:\n");
        sb.append("- Be conservative. Only recommend BUY when 3+ factors align.\n");
        sb.append("- Always provide specific entry, target, and stop-loss prices.\n");
        sb.append("- Risk/reward ratio must be >= 2.0 for a BUY signal.\n");
        sb.append("- Consider current macro environment — avoid aggressive buys in risk-off conditions.\n");
        sb.append("- Factor in sector rotation and relative strength.\n");
        sb.append("- Respond ONLY in valid JSON matching the specified schema.\n");
        sb.append("- Include a 2-3 sentence plain English reasoning.\n");
        sb.append("- If data is insufficient or conflicting, default to HOLD.\n");
        sb.append("- This is NOT financial advice — frame as analytical output.");

        return sb.toString();
    }

    // =========================================================================
    // User Prompt
    // =========================================================================

    private String buildUserPrompt(String symbol,
                                    StockSnapshot snapshot,
                                    FundamentalData fund,
                                    MacroSnapshot macro,
                                    List<String> news) {

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze ").append(symbol).append(" for a position trade (2-8 week hold).\n\n");

        // Price Action
        sb.append("PRICE ACTION (last 60 days):\n");
        sb.append("Current: $").append(fmt(snapshot.getClose()));
        sb.append(" | 50-SMA: $").append(fmt(snapshot.getSma50()));
        sb.append(" | 200-SMA: $").append(fmt(snapshot.getSma200())).append("\n");
        sb.append("RSI(14): ").append(fmtDbl(snapshot.getRsi14()));
        sb.append(" | MACD: ").append(fmtDbl(snapshot.getMacdLine()));
        sb.append("/").append(fmtDbl(snapshot.getMacdSignal()));
        sb.append(" (histogram: ").append(fmtDbl(snapshot.getMacdHistogram())).append(")\n");

        if (fund != null) {
            sb.append("52-week range: $").append(fmt(fund.getLow52Week()));
            sb.append(" - $").append(fmt(fund.getHigh52Week())).append("\n");
            sb.append("Avg volume: ").append(fund.getAvgVolume() != null ? fund.getAvgVolume() : "N/A");
            sb.append(" | Today's volume: ").append(snapshot.getVolume() != null ? snapshot.getVolume() : "N/A").append("\n");
        }

        // Fundamentals
        sb.append("\nFUNDAMENTALS:\n");
        if (fund != null) {
            sb.append("Sector: ").append(fund.getSector() != null ? fund.getSector() : "N/A");
            sb.append(" | Market Cap: $").append(fund.getMarketCap() != null ? fund.getMarketCap() + "M" : "N/A").append("\n");
            sb.append("P/E: ").append(fmtDbl(fund.getPeRatio()));
            sb.append(" | EPS growth (YoY): ").append(fmtDbl(fund.getEpsGrowthYoY())).append("%\n");
            sb.append("Revenue growth (YoY): ").append(fmtDbl(fund.getRevenueGrowthYoY())).append("%");
            sb.append(" | Debt/Equity: ").append(fmtDbl(fund.getDebtToEquity())).append("\n");
        } else {
            sb.append("Fundamental data unavailable — weight technical and macro factors more heavily.\n");
        }

        // Macro Environment
        sb.append("\nMACRO ENVIRONMENT:\n");
        if (macro != null) {
            sb.append("Fed Funds Rate: ").append(fmtDbl(macro.getFedFundsRate())).append("%");
            sb.append(" | 10Y Treasury: ").append(fmtDbl(macro.getTreasury10Y())).append("%\n");
            sb.append("CPI (YoY): ").append(fmtDbl(macro.getCpiYoY())).append("%");
            sb.append(" | S&P 500 vs 200-SMA: ").append(macro.getSpyVs200SMA() != null ? macro.getSpyVs200SMA() : "N/A");
            sb.append(" | VIX: ").append(fmtDbl(macro.getVix())).append("\n");
        } else {
            sb.append("Macro data unavailable.\n");
        }

        // News
        sb.append("\nRECENT NEWS (last 7 days):\n");
        if (news != null && !news.isEmpty()) {
            for (String headline : news) {
                sb.append("- ").append(headline).append("\n");
            }
        } else {
            sb.append("No recent news available.\n");
        }

        // Response format
        sb.append("\nRespond in JSON: {\"symbol\": \"").append(symbol);
        sb.append("\", \"signal\": \"BUY|HOLD|AVOID\", \"confidence\": 0-100, ");
        sb.append("\"entryPrice\": X.XX, \"targetPrice\": X.XX, \"stopLoss\": X.XX, ");
        sb.append("\"riskRewardRatio\": X.XX, \"timeHorizon\": \"X weeks\", ");
        sb.append("\"reasoning\": \"...\", \"factors\": {\"technical\": \"BULLISH|NEUTRAL|BEARISH\", ");
        sb.append("\"fundamental\": \"...\", \"macro\": \"...\", \"sentiment\": \"...\"}}");

        return sb.toString();
    }

    // =========================================================================
    // OpenAI API Call
    // =========================================================================

    @SuppressWarnings("unchecked")
    private String callOpenAI(String systemPrompt, String userPrompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(props.getOpenai().getApiKey());

        Map<String, Object> body = Map.of(
                "model", props.getOpenai().getModel(),
                "temperature", props.getOpenai().getTemperature(),
                "max_tokens", props.getOpenai().getMaxTokens(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        Map<String, Object> response = restTemplate.postForObject(OPENAI_API_URL, request, Map.class);
        if (response == null) {
            throw new RuntimeException("Null response from OpenAI");
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("No choices in OpenAI response");
        }

        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return message.get("content").toString();
    }

    // =========================================================================
    // Response Parsing
    // =========================================================================

    private TradingSignal parseResponse(String jsonContent, String symbol) throws JsonProcessingException {
        // Strip markdown code fences if present
        String cleaned = jsonContent.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }

        JsonNode root = objectMapper.readTree(cleaned);

        TradingSignal signal = new TradingSignal();
        signal.setSymbol(symbol);
        signal.setSignal(getTextOrDefault(root, "signal", "HOLD"));
        signal.setConfidence(root.has("confidence") ? root.get("confidence").asInt() : 50);
        signal.setEntryPrice(getDecimal(root, "entryPrice"));
        signal.setTargetPrice(getDecimal(root, "targetPrice"));
        signal.setStopLoss(getDecimal(root, "stopLoss"));
        signal.setRiskRewardRatio(root.has("riskRewardRatio") ? root.get("riskRewardRatio").asDouble() : null);
        signal.setReasoning(getTextOrDefault(root, "reasoning", "Analysis complete."));
        signal.setTimeHorizon(getTextOrDefault(root, "timeHorizon", "2-6 weeks"));
        signal.setAnalyzedAt(LocalDateTime.now());
        signal.setDataAsOf(LocalDate.now());

        // Store factors as JSON string
        if (root.has("factors")) {
            signal.setFactors(objectMapper.writeValueAsString(root.get("factors")));
        }

        return signal;
    }

    private TradingSignal buildDefaultHoldSignal(String symbol) {
        TradingSignal signal = new TradingSignal();
        signal.setSymbol(symbol);
        signal.setSignal("HOLD");
        signal.setConfidence(0);
        signal.setReasoning("Unable to complete analysis — insufficient data or API error. Defaulting to HOLD.");
        signal.setTimeHorizon("N/A");
        signal.setAnalyzedAt(LocalDateTime.now());
        signal.setDataAsOf(LocalDate.now());
        return signal;
    }

    // =========================================================================
    // JSON Helpers
    // =========================================================================

    private String getTextOrDefault(JsonNode node, String field, String defaultValue) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : defaultValue;
    }

    private BigDecimal getDecimal(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            try {
                return new BigDecimal(node.get(field).asText());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private String fmt(BigDecimal val) {
        return val != null ? val.toPlainString() : "N/A";
    }

    private String fmtDbl(Double val) {
        return val != null ? String.format("%.2f", val) : "N/A";
    }
}
