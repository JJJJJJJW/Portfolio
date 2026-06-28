package com.ace.techfolio.service;

import com.ace.techfolio.dto.AssetResponse;
import com.ace.techfolio.dto.DashboardSummaryResponse;
import com.ace.techfolio.dto.PortfolioAuditResponse;
import com.ace.techfolio.dto.PortfolioAuditResponse.ActionItem;
import com.ace.techfolio.dto.PortfolioAuditResponse.ConcentrationRisk;
import com.ace.techfolio.dto.PortfolioAuditResponse.SavingsWarning;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.PortfolioAudit;
import com.ace.techfolio.repository.PortfolioAuditRepository;
import com.ace.techfolio.repository.UserRepository;
import com.ace.techfolio.service.stockanalyzer.GeminiService;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates portfolio audit analysis using the user's real holdings,
 * dashboard metrics, and risk appetite.
 *
 * <p>Builds a structured prompt for Gemini AI, parses the JSON response
 * into a typed DTO, and persists audit snapshots for historical tracking.</p>
 */
@Service
public class PortfolioAuditService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioAuditService.class);

    private final AssetService assetService;
    private final DashboardService dashboardService;
    private final GeminiService geminiService;
    private final UserRepository userRepository;
    private final PortfolioAuditRepository auditRepository;
    private final ObjectMapper objectMapper;

    public PortfolioAuditService(AssetService assetService,
                                  DashboardService dashboardService,
                                  GeminiService geminiService,
                                  UserRepository userRepository,
                                  PortfolioAuditRepository auditRepository) {
        this.assetService = assetService;
        this.dashboardService = dashboardService;
        this.geminiService = geminiService;
        this.userRepository = userRepository;
        this.auditRepository = auditRepository;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Runs a full portfolio audit for the given user.
     *
     * @param userId             the authenticated user's ID
     * @param investmentTimeline the user-selected investment horizon
     * @return structured audit response from Gemini AI
     */
    @Transactional
    public PortfolioAuditResponse runAudit(UUID userId, String investmentTimeline) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String riskAppetite = user.getRiskAppetite() != null ? user.getRiskAppetite() : "Moderate";

        // Gather portfolio data
        List<AssetResponse> assets = assetService.getAssetsByUser(userId);
        DashboardSummaryResponse dashboard = dashboardService.getDashboardSummary(userId);

        // Build prompts
        String systemPrompt = buildSystemPrompt(riskAppetite, investmentTimeline);
        String userPrompt = buildUserPrompt(assets, dashboard, riskAppetite, investmentTimeline);

        // Call Gemini AI
        String rawResponse;
        try {
            rawResponse = geminiService.callGeminiGeneric(systemPrompt, userPrompt);
        } catch (Exception e) {
            log.error("Gemini API call failed for portfolio audit (user {}): {}", userId, e.getMessage());
            return buildFallbackResponse(dashboard, investmentTimeline, riskAppetite);
        }

        // Parse response
        PortfolioAuditResponse response;
        try {
            response = parseGeminiResponse(rawResponse, dashboard, investmentTimeline, riskAppetite);
        } catch (Exception e) {
            log.error("Failed to parse Gemini audit response for user {}: {}", userId, e.getMessage());
            response = buildFallbackResponse(dashboard, investmentTimeline, riskAppetite);
        }

        // Persist audit snapshot
        try {
            PortfolioAudit audit = new PortfolioAudit();
            audit.setUser(user);
            audit.setPortfolioValue(dashboard.portfolioValue() != null ? dashboard.portfolioValue() : BigDecimal.ZERO);
            audit.setInvestmentTimeline(investmentTimeline);
            audit.setRiskAppetite(riskAppetite);
            audit.setOverallRiskScore(response.getOverallRiskScore());
            audit.setAiResponse(rawResponse);
            PortfolioAudit saved = auditRepository.save(audit);
            response.setId(saved.getId());
            response.setAnalyzedAt(saved.getAnalyzedAt());
        } catch (Exception e) {
            log.error("Failed to persist portfolio audit for user {}: {}", userId, e.getMessage());
        }

        return response;
    }

    /**
     * Returns paginated audit history for a user.
     */
    @Transactional(readOnly = true)
    public Page<PortfolioAuditResponse> getAuditHistory(UUID userId, int page, int size) {
        Page<PortfolioAudit> audits = auditRepository.findByUserIdOrderByAnalyzedAtDesc(
                userId, PageRequest.of(page, Math.min(size, 50)));

        return audits.map(audit -> {
            try {
                PortfolioAuditResponse resp = parseGeminiResponse(
                        audit.getAiResponse(),
                        null,
                        audit.getInvestmentTimeline(),
                        audit.getRiskAppetite());
                resp.setId(audit.getId());
                resp.setAnalyzedAt(audit.getAnalyzedAt());
                resp.setPortfolioValue(audit.getPortfolioValue());
                resp.setOverallRiskScore(audit.getOverallRiskScore() != null ? audit.getOverallRiskScore() : 0);
                return resp;
            } catch (Exception e) {
                log.warn("Failed to parse stored audit {} for user {}: {}", audit.getId(), userId, e.getMessage());
                PortfolioAuditResponse fallback = new PortfolioAuditResponse();
                fallback.setId(audit.getId());
                fallback.setAnalyzedAt(audit.getAnalyzedAt());
                fallback.setPortfolioValue(audit.getPortfolioValue());
                fallback.setInvestmentTimeline(audit.getInvestmentTimeline());
                fallback.setRiskAppetite(audit.getRiskAppetite());
                fallback.setOverallRiskScore(audit.getOverallRiskScore() != null ? audit.getOverallRiskScore() : 0);
                fallback.setSummary("Unable to load audit details.");
                fallback.setConcentrationRisks(List.of());
                fallback.setSavingsWarnings(List.of());
                fallback.setActionItems(List.of());
                fallback.setDiversificationAdvice("");
                return fallback;
            }
        });
    }

    // =========================================================================
    // Prompt Building
    // =========================================================================

    private String buildSystemPrompt(String riskAppetite, String investmentTimeline) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an expert financial advisor AI specializing in portfolio analysis ");
        sb.append("and personalized investment recommendations. You analyze a user's complete ");
        sb.append("portfolio holdings, performance metrics, and financial goals to provide ");
        sb.append("actionable, structured advice.\n\n");

        sb.append("INVESTOR PROFILE:\n");
        sb.append("- Risk Appetite: ").append(riskAppetite).append("\n");
        sb.append("- Investment Timeline: ").append(investmentTimeline).append("\n\n");

        sb.append("RULES:\n");
        sb.append("- Analyze the portfolio for concentration risks (any single asset or category >30% of total value).\n");
        sb.append("- Identify savings/debt feasibility warnings based on goals and current allocation.\n");
        sb.append("- Provide diversification strategy advice tailored to the investor's risk profile and timeline.\n");
        sb.append("- Generate specific, actionable checklist items the investor should execute.\n");
        sb.append("- Assign an overall risk score from 1 (very low risk) to 100 (extreme risk).\n");
        sb.append("- Calibrate advice to the investment timeline: short-term investors need more liquidity ");
        sb.append("and lower volatility; long-term investors can tolerate higher risk for growth.\n");
        sb.append("- Be specific with numbers and percentages. Reference actual asset names from the portfolio.\n");
        sb.append("- This is NOT financial advice — frame as analytical output for educational purposes.\n");
        sb.append("- Respond ONLY in valid JSON matching the specified schema.\n");

        return sb.toString();
    }

    private String buildUserPrompt(List<AssetResponse> assets,
                                     DashboardSummaryResponse dashboard,
                                     String riskAppetite,
                                     String investmentTimeline) {
        StringBuilder sb = new StringBuilder();
        sb.append("Analyze the following portfolio and provide a comprehensive audit report.\n\n");

        // Portfolio Holdings
        sb.append("PORTFOLIO HOLDINGS:\n");
        if (assets.isEmpty()) {
            sb.append("No assets currently held.\n");
        } else {
            for (AssetResponse a : assets) {
                sb.append("- ").append(a.name()).append(" (").append(a.symbol()).append(")")
                        .append(" | Category: ").append(a.category())
                        .append(" | Qty: ").append(a.quantity())
                        .append(" | Avg Price: ").append(fmtBd(a.avgPrice()))
                        .append(" | Current Price: ").append(fmtBd(a.currentPrice()))
                        .append(" | Value: ").append(fmtBd(a.totalValue()))
                        .append(" | P/L: ").append(fmtBd(a.pl()))
                        .append(" | Currency: ").append(a.currency())
                        .append(" | Custom: ").append(a.isCustom())
                        .append("\n");
            }
        }

        // Dashboard Metrics
        sb.append("\nPORTFOLIO METRICS:\n");
        if (dashboard != null) {
            sb.append("Total Portfolio Value: ").append(fmtBd(dashboard.portfolioValue())).append("\n");
            sb.append("Investment Returns: ").append(fmtBd(dashboard.investmentReturns())).append("\n");
            sb.append("Annualised Return: ").append(dashboard.annualisedReturn() != null ? dashboard.annualisedReturn() : "N/A").append("\n");
            sb.append("Realised P/L: ").append(fmtBd(dashboard.realisedPL())).append("\n");
            sb.append("Base Currency: ").append(dashboard.baseCurrency() != null ? dashboard.baseCurrency() : "USD").append("\n");

            // Asset class breakdown
            if (dashboard.assetClassLabels() != null && dashboard.assetClassSeries() != null) {
                sb.append("\nASSET CLASS BREAKDOWN:\n");
                for (int i = 0; i < dashboard.assetClassLabels().size(); i++) {
                    String label = dashboard.assetClassLabels().get(i);
                    double pct = i < dashboard.assetClassSeries().size() ? dashboard.assetClassSeries().get(i) : 0;
                    sb.append("- ").append(label).append(": ").append(String.format("%.1f%%", pct)).append("\n");
                }
            }

            // Top/Worst performers
            if (dashboard.topPerformerSymbol() != null) {
                sb.append("\nTOP PERFORMER: ").append(dashboard.topPerformerSymbol())
                        .append(" (").append(fmtBd(dashboard.topPerformerPct())).append("%, ")
                        .append(fmtBd(dashboard.topPerformerVal())).append(")\n");
            }
            if (dashboard.worstPerformerSymbol() != null) {
                sb.append("WORST PERFORMER: ").append(dashboard.worstPerformerSymbol())
                        .append(" (").append(fmtBd(dashboard.worstPerformerPct())).append("%, ")
                        .append(fmtBd(dashboard.worstPerformerVal())).append(")\n");
            }
        }

        sb.append("\nINVESTOR CONTEXT:\n");
        sb.append("Risk Appetite: ").append(riskAppetite).append("\n");
        sb.append("Investment Timeline: ").append(investmentTimeline).append("\n");

        // Response format
        sb.append("\nRespond in JSON with this exact schema:\n");
        sb.append("{\n");
        sb.append("  \"overallRiskScore\": <1-100 integer>,\n");
        sb.append("  \"summary\": \"<2-3 sentence executive summary of the portfolio health>\",\n");
        sb.append("  \"concentrationRisks\": [\n");
        sb.append("    { \"asset\": \"<asset name or category>\", \"allocationPct\": <number>, \"severity\": \"HIGH|MEDIUM|LOW\", \"advice\": \"<specific recommendation>\" }\n");
        sb.append("  ],\n");
        sb.append("  \"savingsWarnings\": [\n");
        sb.append("    { \"title\": \"<warning title>\", \"advice\": \"<specific recommendation>\" }\n");
        sb.append("  ],\n");
        sb.append("  \"diversificationAdvice\": \"<detailed strategy recommendation>\",\n");
        sb.append("  \"actionItems\": [\n");
        sb.append("    { \"text\": \"<specific action to take>\", \"priority\": \"HIGH|MEDIUM|LOW\" }\n");
        sb.append("  ]\n");
        sb.append("}\n");

        return sb.toString();
    }

    // =========================================================================
    // Response Parsing
    // =========================================================================

    private PortfolioAuditResponse parseGeminiResponse(String rawJson,
                                                         DashboardSummaryResponse dashboard,
                                                         String investmentTimeline,
                                                         String riskAppetite) throws JsonProcessingException {
        String cleaned = rawJson.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }

        JsonNode root = objectMapper.readTree(cleaned);
        PortfolioAuditResponse resp = new PortfolioAuditResponse();

        resp.setPortfolioValue(dashboard != null && dashboard.portfolioValue() != null
                ? dashboard.portfolioValue() : BigDecimal.ZERO);
        resp.setInvestmentTimeline(investmentTimeline);
        resp.setRiskAppetite(riskAppetite);
        resp.setOverallRiskScore(root.has("overallRiskScore") ? root.get("overallRiskScore").asInt() : 50);
        resp.setSummary(root.has("summary") ? root.get("summary").asText() : "Portfolio analysis complete.");

        // Concentration Risks
        List<ConcentrationRisk> risks = new ArrayList<>();
        if (root.has("concentrationRisks") && root.get("concentrationRisks").isArray()) {
            for (JsonNode node : root.get("concentrationRisks")) {
                ConcentrationRisk risk = new ConcentrationRisk();
                risk.setAsset(node.has("asset") ? node.get("asset").asText() : "Unknown");
                risk.setAllocationPct(node.has("allocationPct") ? node.get("allocationPct").asDouble() : 0);
                risk.setSeverity(node.has("severity") ? node.get("severity").asText() : "MEDIUM");
                risk.setAdvice(node.has("advice") ? node.get("advice").asText() : "");
                risks.add(risk);
            }
        }
        resp.setConcentrationRisks(risks);

        // Savings Warnings
        List<SavingsWarning> warnings = new ArrayList<>();
        if (root.has("savingsWarnings") && root.get("savingsWarnings").isArray()) {
            for (JsonNode node : root.get("savingsWarnings")) {
                SavingsWarning warning = new SavingsWarning();
                warning.setTitle(node.has("title") ? node.get("title").asText() : "Warning");
                warning.setAdvice(node.has("advice") ? node.get("advice").asText() : "");
                warnings.add(warning);
            }
        }
        resp.setSavingsWarnings(warnings);

        // Diversification Advice
        resp.setDiversificationAdvice(root.has("diversificationAdvice")
                ? root.get("diversificationAdvice").asText()
                : "Consider diversifying your portfolio across multiple asset classes.");

        // Action Items
        List<ActionItem> items = new ArrayList<>();
        if (root.has("actionItems") && root.get("actionItems").isArray()) {
            for (JsonNode node : root.get("actionItems")) {
                ActionItem item = new ActionItem();
                item.setText(node.has("text") ? node.get("text").asText() : "");
                item.setPriority(node.has("priority") ? node.get("priority").asText() : "MEDIUM");
                item.setCompleted(node.has("completed") && node.get("completed").asBoolean());
                items.add(item);
            }
        }
        resp.setActionItems(items);

        return resp;
    }

    /**
     * Toggles the completed status of an action item in the saved portfolio audit report.
     *
     * @param userId     the authenticated user's ID
     * @param auditId    the ID of the target portfolio audit
     * @param itemIndex  the index of the action item to toggle
     * @return true if successful, false otherwise
     */
    @Transactional
    public boolean toggleActionItem(UUID userId, UUID auditId, int itemIndex) {
        PortfolioAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new IllegalArgumentException("Audit not found: " + auditId));

        if (!audit.getUser().getId().equals(userId)) {
            throw new SecurityException("Unauthorized access to portfolio audit " + auditId);
        }

        try {
            JsonNode root = objectMapper.readTree(audit.getAiResponse());
            if (root.has("actionItems") && root.get("actionItems").isArray()) {
                com.fasterxml.jackson.databind.node.ArrayNode arrayNode = (com.fasterxml.jackson.databind.node.ArrayNode) root.get("actionItems");
                if (itemIndex >= 0 && itemIndex < arrayNode.size()) {
                    com.fasterxml.jackson.databind.node.ObjectNode itemNode = (com.fasterxml.jackson.databind.node.ObjectNode) arrayNode.get(itemIndex);
                    boolean currentStatus = itemNode.has("completed") && itemNode.get("completed").asBoolean();
                    itemNode.put("completed", !currentStatus);

                    audit.setAiResponse(objectMapper.writeValueAsString(root));
                    auditRepository.save(audit);
                    return true;
                }
            }
        } catch (Exception e) {
            log.error("Failed to toggle action item at index {} for audit {}: {}", itemIndex, auditId, e.getMessage());
        }
        return false;
    }

    // =========================================================================
    // Fallback
    // =========================================================================

    private PortfolioAuditResponse buildFallbackResponse(DashboardSummaryResponse dashboard,
                                                           String investmentTimeline,
                                                           String riskAppetite) {
        PortfolioAuditResponse resp = new PortfolioAuditResponse();
        resp.setPortfolioValue(dashboard != null && dashboard.portfolioValue() != null
                ? dashboard.portfolioValue() : BigDecimal.ZERO);
        resp.setInvestmentTimeline(investmentTimeline);
        resp.setRiskAppetite(riskAppetite);
        resp.setOverallRiskScore(50);
        resp.setSummary("Unable to complete AI analysis. Please try again later.");
        resp.setConcentrationRisks(List.of());
        resp.setSavingsWarnings(List.of());
        resp.setDiversificationAdvice("Consider diversifying your portfolio across multiple asset classes to reduce risk.");
        resp.setActionItems(List.of(
                new ActionItem("Review your portfolio allocation manually", "HIGH"),
                new ActionItem("Consider consulting a financial advisor", "MEDIUM")));
        return resp;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String fmtBd(BigDecimal val) {
        return val != null ? val.toPlainString() : "N/A";
    }

    private String fmtBd(Double val) {
        return val != null ? String.format("%.2f", val) : "N/A";
    }
}
