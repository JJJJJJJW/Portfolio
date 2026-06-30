import { useState, useEffect, useRef, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { 
  CheckCircleIcon, 
  SparklesIcon, 
  InfoIcon 
} from "../../icons";
import { useUser } from "../../context/UserContext";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { useDashboardData } from "../../hooks/useDashboardData";

// =========================================================================
// Types
// =========================================================================

interface ConcentrationRisk {
  asset: string;
  allocationPct: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
  advice: string;
}

interface SavingsWarning {
  title: string;
  advice: string;
}

interface ActionItem {
  text: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  completed: boolean;
}

interface AuditReport {
  id: string;
  analyzedAt: string;
  portfolioValue: number;
  investmentTimeline: string;
  riskAppetite: string;
  overallRiskScore: number;
  summary: string;
  concentrationRisks: ConcentrationRisk[];
  savingsWarnings: SavingsWarning[];
  diversificationAdvice: string;
  actionItems: ActionItem[];
}

const TIMELINE_OPTIONS = [
  { value: "Short-term (< 1 year)", label: "Short-term", sublabel: "Less than 1 year" },
  { value: "Medium-term (1-3 years)", label: "Medium-term", sublabel: "1 to 3 years" },
  { value: "Long-term (3-5 years)", label: "Long-term", sublabel: "3 to 5 years" },
  { value: "Very Long-term (5+ years)", label: "Very Long-term", sublabel: "5+ years" },
];

export default function Advisor() {
  const { isAuthenticated, session, user, showToast, loading: authLoading } = useUser();
  const isGuest = !isAuthenticated;
  const { positions } = usePortfolioData();
  const { metrics } = useDashboardData();

  const [scanStep, setScanStep] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [adviceGenerated, setAdviceGenerated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout Tab selection
  const [activeTab, setActiveTab] = useState<"audit" | "history" | "analyzer">("analyzer");

  const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

  // Investment Timeline Modal
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState("");

  // Current audit report from Gemini
  const [currentAudit, setCurrentAudit] = useState<AuditReport | null>(null);

  // Audit history from backend
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>([]);
  const [historyLoadingAudit, setHistoryLoadingAudit] = useState(false);
  const [auditHistoryPage, setAuditHistoryPage] = useState(0);
  const [auditHistoryTotalPages, setAuditHistoryTotalPages] = useState(1);

  // Selected history snapshot
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Helper to format UTC timestamps to GMT+8
  const formatGmt8 = (dateStr: string) => {
    if (!dateStr) return "";
    let dateStrFixed = dateStr;
    if (!dateStr.endsWith("Z") && !dateStr.includes("+") && dateStr.includes("T")) {
      dateStrFixed = dateStr + "Z";
    }
    try {
      const date = new Date(dateStrFixed);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleString("en-US", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) + " (GMT+8)";
    } catch {
      return dateStr;
    }
  };

  // Stock Analyzer States
  const [searchSymbol, setSearchSymbol] = useState("");
  const [activeSignal, setActiveSignal] = useState<any>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analyzerStep, setAnalyzerStep] = useState(0);
  const [analyzerStepText, setAnalyzerStepText] = useState("");
  const [historySignals, setHistorySignals] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const GUEST_HISTORY = [
    {
      symbol: "NVDA",
      signal: "BUY",
      confidence: 85,
      entryPrice: 125.50,
      targetPrice: 150.00,
      stopLoss: 112.00,
      riskRewardRatio: 1.8,
      reasoning: "Strong technical consolidation near the 50-day EMA with expanding RSI momentum. Fundamental growth is supported by high GPU demand and sector tailwinds.",
      timeHorizon: "2-6 weeks",
      factors: JSON.stringify({ technical: "BULLISH", fundamental: "BULLISH", macro: "BULLISH", sentiment: "BULLISH" }),
      analyzedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      dataAsOf: new Date().toISOString().split("T")[0]
    },
    {
      symbol: "AAPL",
      signal: "HOLD",
      confidence: 65,
      entryPrice: 180.20,
      targetPrice: 195.00,
      stopLoss: 172.00,
      riskRewardRatio: 1.5,
      reasoning: "Technical indicators are neutral. Sma50 and Sma205 show flat trends. Market consolidation expected prior to new product announcements.",
      timeHorizon: "1-3 months",
      factors: JSON.stringify({ technical: "NEUTRAL", fundamental: "NEUTRAL", macro: "NEUTRAL", sentiment: "NEUTRAL" }),
      analyzedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      dataAsOf: new Date(Date.now() - 3600000 * 24).toISOString().split("T")[0]
    },
    {
      symbol: "TSLA",
      signal: "AVOID",
      confidence: 78,
      entryPrice: 175.40,
      targetPrice: 140.00,
      stopLoss: 190.00,
      riskRewardRatio: 0.8,
      reasoning: "Price action has broken below the 200-day SMA, establishing a bearish pattern. Margin squeeze concerns persist alongside slowing global delivery volumes.",
      timeHorizon: "2-4 weeks",
      factors: JSON.stringify({ technical: "BEARISH", fundamental: "WEAK", macro: "NEUTRAL", sentiment: "BEARISH" }),
      analyzedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      dataAsOf: new Date(Date.now() - 3600000 * 48).toISOString().split("T")[0]
    }
  ];

  const generateMockSignal = (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    const hash = sym.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const signalType = hash % 3 === 0 ? "BUY" : hash % 3 === 1 ? "HOLD" : "AVOID";
    const confidence = 55 + (hash % 40);
    const entryPrice = 50 + (hash % 400);
    const targetPrice = signalType === "BUY" ? entryPrice * 1.20 : signalType === "HOLD" ? entryPrice * 1.05 : entryPrice * 0.85;
    const stopLoss = signalType === "BUY" ? entryPrice * 0.90 : signalType === "HOLD" ? entryPrice * 0.95 : entryPrice * 1.10;
    const rr = Math.abs((targetPrice - entryPrice) / (entryPrice - stopLoss));
    const factors = {
      technical: signalType === "BUY" ? "BULLISH" : signalType === "HOLD" ? "NEUTRAL" : "BEARISH",
      fundamental: (signalType === "BUY" || signalType === "HOLD")
        ? (hash % 2 === 0 ? "BULLISH" : "NEUTRAL")
        : (hash % 2 === 0 ? "STRONG" : "NEUTRAL"),
      macro: "NEUTRAL",
      sentiment: signalType === "BUY" ? "BULLISH" : signalType === "HOLD" ? "NEUTRAL" : "BEARISH"
    };

    return {
      symbol: sym,
      signal: signalType,
      confidence: Math.round(confidence),
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      targetPrice: parseFloat(targetPrice.toFixed(2)),
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      riskRewardRatio: parseFloat(rr.toFixed(2)),
      reasoning: `Technical momentum points to a ${factors.technical.toLowerCase()} setup. Fundamentals appear ${factors.fundamental.toLowerCase()} with solid metrics, and market sentiment is ${factors.sentiment.toLowerCase()}. Support levels are established around $${stopLoss.toFixed(2)}.`,
      timeHorizon: "2-6 weeks",
      factors: JSON.stringify(factors),
      analyzedAt: new Date().toISOString(),
      dataAsOf: new Date().toISOString().split("T")[0],
      disclaimer: "This is algorithmic analysis for educational purposes only. Not financial advice. Always do your own research before trading."
    };
  };



  const fetchHistory = async (page: number) => {
    if (authLoading) return; // Wait for auth to resolve before deciding guest vs real
    if (isGuest) {
      setHistorySignals(GUEST_HISTORY);
      setHistoryPage(0);
      setHistoryTotalPages(1);
      return;
    }

    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/stock-analyzer/history?page=${page}&size=5`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistorySignals(data.signals || []);
        setHistoryPage(data.page || 0);
        setHistoryTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching signal history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAnalyzeTicker = async (symbol: string) => {
    const cleanSym = symbol.toUpperCase().trim();
    if (!cleanSym) return;

    setSignalLoading(true);
    setActiveSignal(null);
    setSearchSymbol(cleanSym);

    // Visual wow factor: simulate steps
    setAnalyzerStep(1);
    setAnalyzerStepText("Fetching live price bars from Polygon...");
    
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    if (isGuest) {
      await delay(700);
      setAnalyzerStep(2);
      setAnalyzerStepText("Calculating local technical indicators (RSI, SMA, MACD)...");
      await delay(700);
      setAnalyzerStep(3);
      setAnalyzerStepText("Retrieving company financials and news sentiment...");
      await delay(700);
      setAnalyzerStep(4);
      setAnalyzerStepText("Generating AI signal with Gemini...");
      await delay(700);

      const result = generateMockSignal(cleanSym);
      setActiveSignal(result);
      setSignalLoading(false);
      setAnalyzerStep(0);
      showToast(`Analysis completed for ${cleanSym}!`, "success");
      return;
    }

    try {
      const stepPromise = (async () => {
        await delay(500);
        setAnalyzerStep(2);
        setAnalyzerStepText("Calculating local technical indicators (RSI, SMA, MACD)...");
        await delay(500);
        setAnalyzerStep(3);
        setAnalyzerStepText("Retrieving company financials and news sentiment...");
        await delay(500);
        setAnalyzerStep(4);
        setAnalyzerStepText("Generating AI signal with Gemini...");
      })();

      const fetchPromise = fetch(`${API_URL}/api/v1/stock-analyzer/signal/${cleanSym}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const [_, res] = await Promise.all([stepPromise, fetchPromise]);

      if (res.ok) {
        const data = await res.json();
        setActiveSignal(data);
        showToast(`Analysis completed for ${cleanSym}!`, "success");
        fetchHistory(0);
      } else {
        if (res.status === 422) {
          showToast(`Unable to process ticker ${cleanSym}. Check symbol spelling.`, "error");
        } else {
          showToast("Failed to fetch AI signal. Check rate limits or API keys.", "error");
        }
      }
    } catch (err) {
      console.error("Error fetching signal:", err);
      showToast("Network error. AI analysis failed.", "error");
    } finally {
      setSignalLoading(false);
      setAnalyzerStep(0);
    }
  };

  useEffect(() => {
    if (authLoading) return; // Don't fetch until auth state is resolved
    if (activeTab === "analyzer") {
      fetchHistory(0);
    }
  }, [activeTab, session, authLoading]);

  // =========================================================================
  // Portfolio Audit Logic
  // =========================================================================

  // Generate mock audit for guest users
  const generateGuestAudit = (timeline: string): AuditReport => {
    const totalValue = positions.reduce((acc, p) => acc + p.totalValue, 0);

    // Calculate actual allocations from guest positions
    const allocations = positions.map(p => ({
      name: p.name,
      symbol: p.symbol,
      pct: totalValue > 0 ? (p.totalValue / totalValue) * 100 : 0,
      category: p.category || "STOCK",
    }));

    const concentrationRisks: ConcentrationRisk[] = allocations
      .filter(a => a.pct > 30)
      .map(a => ({
        asset: `${a.name} (${a.symbol})`,
        allocationPct: parseFloat(a.pct.toFixed(1)),
        severity: (a.pct > 60 ? "HIGH" : a.pct > 40 ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW",
        advice: a.pct > 60
          ? `Your ${a.symbol} holding represents ${a.pct.toFixed(1)}% of your portfolio. This creates extreme concentration risk. Consider rebalancing to below 30% by diversifying into index funds or other asset classes.`
          : `${a.symbol} at ${a.pct.toFixed(1)}% is moderately concentrated. Monitor closely and consider trimming to reduce single-asset exposure.`
      }));

    const riskAppetite = user?.riskAppetite || "Moderate";
    const isShortTerm = timeline.includes("Short") || timeline.includes("< 1");

    return {
      id: `guest_${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      portfolioValue: totalValue,
      investmentTimeline: timeline,
      riskAppetite,
      overallRiskScore: concentrationRisks.some(r => r.severity === "HIGH") ? 72 : 45,
      summary: `Your portfolio of $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} shows ${concentrationRisks.length > 0 ? "notable concentration risks" : "reasonable diversification"}. ${isShortTerm ? "Given your short-term timeline, maintaining liquidity should be a priority." : "Your longer timeline allows for growth-oriented positioning."}`,
      concentrationRisks,
      savingsWarnings: [
        {
          title: "Portfolio Diversification Gap",
          advice: `With ${allocations.length} asset${allocations.length !== 1 ? "s" : ""}, your portfolio would benefit from broader diversification across sectors, geographies, and asset classes to reduce correlation risk.`
        }
      ],
      diversificationAdvice: `To offset volatility, consider initiating a Dollar-Cost-Averaging (DCA) program into standard index funds (like S&P 500 or Nasdaq trackers). ${isShortTerm ? "For your short-term horizon, prioritize stable, low-beta assets." : "For your longer timeline, growth-oriented diversification is appropriate."}`,
      actionItems: [
        ...(concentrationRisks.length > 0
          ? [{ text: `Reduce ${concentrationRisks[0].asset} below 30% to mitigate concentration risk`, priority: "HIGH" as const, completed: false }]
          : []),
        { text: "Set up automated monthly deposit for diversified index fund ETFs", priority: "MEDIUM" as const, completed: false },
        { text: `Allocate 15% of monthly investment toward ${isShortTerm ? "bond ETFs for stability" : "growth sector ETFs"}`, priority: "MEDIUM" as const, completed: false },
        { text: "Review and rebalance portfolio quarterly against target allocations", priority: "LOW" as const, completed: false },
      ]
    };
  };

  // Handle the "Trigger AI Analysis" button — opens timeline modal first
  const handleOpenTimelineModal = () => {
    setShowTimelineModal(true);
    setSelectedTimeline("");
  };

  // Run the actual audit after timeline is selected
  const handleRunAudit = async () => {
    if (!selectedTimeline) return;
    setShowTimelineModal(false);
    setIsScanning(true);
    setAdviceGenerated(false);
    setSelectedHistoryId(null);
    setScanStep(1);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    if (isGuest) {
      await delay(800);
      setScanStep(2);
      await delay(800);
      setScanStep(3);
      await delay(800);
      setScanStep(4);
      await delay(600);

      const result = generateGuestAudit(selectedTimeline);
      setCurrentAudit(result);
      setIsScanning(false);
      setAdviceGenerated(true);
      setScanStep(0);
      showToast("Portfolio audit completed!", "success");
      return;
    }

    // Authenticated: call the real backend
    try {
      const stepPromise = (async () => {
        await delay(600);
        setScanStep(2);
        await delay(600);
        setScanStep(3);
        await delay(600);
        setScanStep(4);
      })();

      const fetchPromise = fetch(`${API_URL}/api/v1/portfolio-audit/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ investmentTimeline: selectedTimeline }),
      });

      const [, res] = await Promise.all([stepPromise, fetchPromise]);

      if (res.ok) {
        const data = await res.json();
        const report: AuditReport = {
          id: data.id || `audit_${Date.now()}`,
          analyzedAt: data.analyzedAt || new Date().toISOString(),
          portfolioValue: data.portfolioValue || 0,
          investmentTimeline: data.investmentTimeline || selectedTimeline,
          riskAppetite: data.riskAppetite || user?.riskAppetite || "Moderate",
          overallRiskScore: data.overallRiskScore || 50,
          summary: data.summary || "Analysis complete.",
          concentrationRisks: (data.concentrationRisks || []).map((r: any) => ({
            asset: r.asset,
            allocationPct: r.allocationPct,
            severity: r.severity || "MEDIUM",
            advice: r.advice || "",
          })),
          savingsWarnings: (data.savingsWarnings || []).map((w: any) => ({
            title: w.title,
            advice: w.advice || "",
          })),
          diversificationAdvice: data.diversificationAdvice || "",
          actionItems: (data.actionItems || []).map((a: any) => ({
            text: a.text,
            priority: a.priority || "MEDIUM",
            completed: false,
          })),
        };
        setCurrentAudit(report);
        showToast("Portfolio audit completed!", "success");
        // Refresh audit history
        fetchAuditHistory(0);
      } else {
        showToast("Portfolio audit failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("Portfolio audit error:", err);
      showToast("Network error during portfolio audit.", "error");
    } finally {
      setIsScanning(false);
      setAdviceGenerated(true);
      setScanStep(0);
    }
  };

  // Fetch audit history from backend
  const fetchAuditHistory = useCallback(async (page: number) => {
    if (authLoading) return;
    if (isGuest) {
      setAuditHistory([]);
      return;
    }

    setHistoryLoadingAudit(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio-audit/history?page=${page}&size=10`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const audits = (data.audits || []).map((a: any) => ({
          id: a.id,
          analyzedAt: a.analyzedAt || "",
          portfolioValue: a.portfolioValue || 0,
          investmentTimeline: a.investmentTimeline || "",
          riskAppetite: a.riskAppetite || "",
          overallRiskScore: a.overallRiskScore || 0,
          summary: a.summary || "",
          concentrationRisks: (a.concentrationRisks || []).map((r: any) => ({
            asset: r.asset,
            allocationPct: r.allocationPct,
            severity: r.severity || "MEDIUM",
            advice: r.advice || "",
          })),
          savingsWarnings: (a.savingsWarnings || []).map((w: any) => ({
            title: w.title,
            advice: w.advice || "",
          })),
          diversificationAdvice: a.diversificationAdvice || "",
          actionItems: (a.actionItems || []).map((ai: any) => ({
            text: ai.text,
            priority: ai.priority || "MEDIUM",
            completed: ai.completed || false,
          })),
        }));
        setAuditHistory(audits);
        setAuditHistoryPage(data.page || 0);
        setAuditHistoryTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching audit history:", err);
    } finally {
      setHistoryLoadingAudit(false);
    }
  }, [isGuest, session?.access_token, API_URL, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (activeTab === "history") {
      fetchAuditHistory(0);
    }
  }, [activeTab, fetchAuditHistory, authLoading]);

  // Toggle action item completion
  const handleToggleActionItem = async (idx: number) => {
    let targetId = "";
    if (selectedHistoryId) {
      targetId = selectedHistoryId;
      const updatedHistory = auditHistory.map((h) => {
        if (h.id === selectedHistoryId) {
          const updatedItems = [...h.actionItems];
          updatedItems[idx] = { ...updatedItems[idx], completed: !updatedItems[idx].completed };
          return { ...h, actionItems: updatedItems };
        }
        return h;
      });
      setAuditHistory(updatedHistory);
    } else if (currentAudit) {
      targetId = currentAudit.id;
      const updatedItems = [...currentAudit.actionItems];
      updatedItems[idx] = { ...updatedItems[idx], completed: !updatedItems[idx].completed };
      setCurrentAudit({ ...currentAudit, actionItems: updatedItems });
    }

    // Persist to backend if not guest and targetId exists
    if (!isGuest && targetId && !targetId.startsWith("guest_")) {
      try {
        await fetch(`${API_URL}/api/v1/portfolio-audit/${targetId}/action-items/${idx}/toggle`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (err) {
        console.error("Failed to persist action item toggle to backend:", err);
      }
    }
  };

  const handleRestoreSnapshot = (id: string | null) => {
    setSelectedHistoryId(id);
    setActiveTab("audit");
  };

  // Determine current display values
  const isViewingHistory = selectedHistoryId !== null;
  const displayAudit: AuditReport | null = isViewingHistory
    ? auditHistory.find(h => h.id === selectedHistoryId) || null
    : currentAudit;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Helpers for risk score display
  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-orange-500";
    return "text-emerald-500";
  };

  const getRiskScoreBarColor = (score: number) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-emerald-500";
  };

  const getRiskScoreLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Moderate Risk";
    return "Low Risk";
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "bg-red-500/5 dark:bg-red-500/10 border-red-500/20";
      case "MEDIUM":
        return "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/20";
      case "LOW":
        return "bg-yellow-500/5 dark:bg-yellow-500/10 border-yellow-500/20";
      default:
        return "bg-gray-500/5 dark:bg-gray-500/10 border-gray-500/20";
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case "HIGH": return "text-red-600 dark:text-red-400";
      case "MEDIUM": return "text-orange-600 dark:text-orange-400";
      case "LOW": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "error";
      case "LOW": return "info";
      default: return "warning";
    }
  };

  return (
    <>
      <PageMeta
        title="AI Financial Advisor - Finance & Goal Dashboard"
        description="Get personalized, automated investment advice and goal feasibility insights based on your portfolio."
      />

      <div ref={containerRef} className="space-y-6 relative h-full">
        {/* Title Header & Tabs */}
        <div className={`transition-all duration-1000 delay-100 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Financial Advisor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Get personalized diagnostic advice by analysing your assets.
          </p>
          
          <div className="flex justify-center md:justify-start border-b border-gray-200 dark:border-gray-800 mt-5">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === "analyzer"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Stock Analyzer
              {activeTab === "analyzer" && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-brand-500 rounded-t-lg" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === "audit"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Portfolio Audit
              {activeTab === "audit" && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-brand-500 rounded-t-lg" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === "history"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Audit History Log
              {activeTab === "history" && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-brand-500 rounded-t-lg" />
              )}
            </button>
            
          </div>
        </div>

        {/* Investment Timeline Modal */}
        {showTimelineModal && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <SparklesIcon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Investment Timeline</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select your investment horizon so the AI can calibrate risk thresholds and strategy recommendations to your timeline.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {TIMELINE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTimeline(option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedTimeline === option.value
                        ? "border-brand-500 bg-brand-500/5 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-sm font-bold ${selectedTimeline === option.value ? "text-brand-500" : "text-gray-800 dark:text-white"}`}>
                          {option.label}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{option.sublabel}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedTimeline === option.value
                          ? "border-brand-500 bg-brand-500"
                          : "border-gray-300 dark:border-gray-700"
                      }`}>
                        {selectedTimeline === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* User context summary */}
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 mb-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-semibold">Risk Appetite: </span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.riskAppetite || "Moderate"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Positions: </span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{positions.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Portfolio: </span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{metrics.portfolioValue}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunAudit}
                  disabled={!selectedTimeline}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                >
                  Run AI Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Portfolio Audit */}
        {activeTab === "audit" && (
          <div className={`transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
            <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              
              {/* Scan Trigger Screen */}
              {!isScanning && !adviceGenerated && !isViewingHistory && (
                <div className="max-w-md mx-auto py-12 text-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Compile & Audit Assets</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Evaluate your holdings concentration risks, overall beta allocations, and goal timelines dynamically using your real portfolio data.
                  </p>
                  {positions.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {positions.slice(0, 5).map(p => (
                        <span key={p.id} className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                          {p.symbol}
                        </span>
                      ))}
                      {positions.length > 5 && (
                        <span className="text-xs font-bold text-gray-400 px-2 py-1">+{positions.length - 5} more</span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleOpenTimelineModal}
                    className="mt-6 inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                  >
                    Trigger AI Analysis
                  </button>
                </div>
              )}

              {/* Progress loading screen */}
              {isScanning && (
                <div className="max-w-md mx-auto py-12 text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white">Analyzing Financial Profiles...</h3>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-4">
                      <div
                        className="h-full bg-brand-500 transition-all duration-500"
                        style={{
                          width: `${scanStep === 1 ? 25 : scanStep === 2 ? 55 : scanStep === 3 ? 80 : 100}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                      {scanStep === 1 && "Compiling portfolio holdings and live prices..."}
                      {scanStep === 2 && "Calculating asset allocations and risk exposure..."}
                      {scanStep === 3 && "Processing metrics through Gemini AI model..."}
                      {scanStep === 4 && "Generating personalized recommendations..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Advice rendering */}
              {(adviceGenerated || isViewingHistory) && !isScanning && displayAudit && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-150 dark:border-gray-800 pb-5 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {isViewingHistory ? `Historical Snapshot` : "Current Audit Report"}
                        </h3>
                        {isViewingHistory && (
                          <Badge color="warning" variant="light">
                            Read Only
                          </Badge>
                        )}
                        <Badge color={displayAudit.overallRiskScore >= 70 ? "error" : displayAudit.overallRiskScore >= 40 ? "warning" : "success"} variant="light">
                          {displayAudit.investmentTimeline}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isViewingHistory
                          ? `Archived on ${formatGmt8(displayAudit.analyzedAt)}`
                          : `Audit finished ${formatGmt8(displayAudit.analyzedAt)} • Based on live portfolio state`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {isViewingHistory && (
                        <button
                          onClick={() => handleRestoreSnapshot(null)}
                          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-5 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 transition-colors"
                        >
                          Return to Current
                        </button>
                      )}
                      <button
                        onClick={handleOpenTimelineModal}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-800"
                      >
                        Run New Scan
                      </button>
                    </div>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-800 rounded-2xl p-5 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-white">Overall Portfolio Risk Score</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-extrabold ${getRiskScoreColor(displayAudit.overallRiskScore)}`}>
                          {displayAudit.overallRiskScore}/100
                        </span>
                        <Badge color={displayAudit.overallRiskScore >= 70 ? "error" : displayAudit.overallRiskScore >= 40 ? "warning" : "success"} variant="light">
                          {getRiskScoreLabel(displayAudit.overallRiskScore)}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-855 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getRiskScoreBarColor(displayAudit.overallRiskScore)}`}
                        style={{ width: `${displayAudit.overallRiskScore}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                      {displayAudit.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    {/* Left Audit Findings */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Concentration Risks */}
                      {displayAudit.concentrationRisks.length > 0 && displayAudit.concentrationRisks.map((risk, idx) => (
                        <div key={idx} className={`border rounded-2xl p-5 ${getSeverityStyle(risk.severity)}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className={`font-bold text-base ${getSeverityTextColor(risk.severity)}`}>
                              Concentration Risk: {risk.asset} ({risk.allocationPct}%)
                            </h4>
                            <Badge
                              color={risk.severity === "HIGH" ? "error" : risk.severity === "MEDIUM" ? "warning" : "info"}
                              variant="light"
                            >
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-650 dark:text-gray-350 mt-1.5 leading-relaxed">
                            {risk.advice}
                          </p>
                        </div>
                      ))}

                      {/* Savings Warnings */}
                      {displayAudit.savingsWarnings.length > 0 && displayAudit.savingsWarnings.map((warning, idx) => (
                        <div key={idx} className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5">
                          <h4 className="font-bold text-orange-600 dark:text-orange-400 text-base">{warning.title}</h4>
                          <p className="text-sm text-gray-650 dark:text-gray-355 mt-1.5 leading-relaxed">
                            {warning.advice}
                          </p>
                        </div>
                      ))}

                      {/* Diversification Advice */}
                      {displayAudit.diversificationAdvice && (
                        <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-800/20">
                          <h4 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                            Diversification Blueprint
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                            {displayAudit.diversificationAdvice}
                          </p>
                        </div>
                      )}

                      {/* No findings state */}
                      {displayAudit.concentrationRisks.length === 0 && displayAudit.savingsWarnings.length === 0 && (
                        <div className="border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl p-5">
                          <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-base">No Critical Risks Detected</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                            Your portfolio appears to be well-diversified with no significant concentration risks detected at this time.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Checklists */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-800/20 h-full">
                        <h4 className="font-bold text-gray-800 dark:text-white text-base mb-4">Advisory Action Checklist</h4>
                        <div className="space-y-4">
                          {displayAudit.actionItems.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleToggleActionItem(idx)}
                              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl transition-all cursor-pointer hover:shadow-xs"
                            >
                              <div className="mt-0.5">
                                {item.completed ? (
                                  <CheckCircleIcon className="w-5 h-5 text-brand-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-medium leading-normal ${item.completed ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}>
                                  {item.text}
                                </p>
                                <Badge color={getPriorityBadgeColor(item.priority) as any} variant="light" size="sm">
                                  {item.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {displayAudit.actionItems.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">No action items generated.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Audit History Log */}
        {activeTab === "history" && (
          <div className={`transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
            <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Advisory Audit Log</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Click on any past scan to restore parameters and track asset rebalancing improvements over time.
                </p>
              </div>

              {isGuest ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400 font-semibold">Sign in to track your audit history across sessions.</p>
                  <p className="text-xs text-gray-400 mt-1">Guest audit results are not persisted.</p>
                </div>
              ) : historyLoadingAudit ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : auditHistory.length === 0 && !currentAudit ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400 font-semibold">No audit history yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Run your first portfolio audit to start tracking recommendations.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {/* Current Live Card */}
                    {adviceGenerated && currentAudit && (
                      <div
                        onClick={() => handleRestoreSnapshot(null)}
                        className={`rounded-xl p-4 border cursor-pointer transition-all ${
                          selectedHistoryId === null
                            ? "border-brand-500/30 bg-brand-50/20 dark:bg-brand-500/5"
                            : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:border-gray-200 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">Active Diagnostic</span>
                          </div>
                          <span className={`text-sm font-bold ${getRiskScoreColor(currentAudit.overallRiskScore)}`}>
                            {currentAudit.overallRiskScore}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Value</span>
                            <span className="text-gray-900 dark:text-white font-medium">RM {currentAudit.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Findings</span>
                            <span className="text-red-500 font-medium">{currentAudit.concentrationRisks.length} risks</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* History Cards */}
                    {auditHistory.map((entry) => {
                      const isSelected = selectedHistoryId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => handleRestoreSnapshot(entry.id)}
                          className={`rounded-xl p-4 border cursor-pointer transition-all ${
                            isSelected
                              ? "border-brand-500/30 bg-brand-50/20 dark:bg-brand-500/5"
                              : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:border-gray-200 dark:hover:border-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[65%]">{formatGmt8(entry.analyzedAt)}</span>
                            <span className={`text-sm font-bold ${getRiskScoreColor(entry.overallRiskScore)}`}>
                              {entry.overallRiskScore}/100
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Value</span>
                              <span className="text-gray-900 dark:text-white font-medium">RM {entry.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Findings</span>
                              <span className="text-red-500 font-medium">{entry.concentrationRisks.length} risks</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 text-[10px] font-bold text-brand-500 text-right">Currently Viewing</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-150 dark:border-gray-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Audit Date</th>
                          <th className="px-4 py-3 font-semibold text-right">Portfolio Value</th>
                          <th className="px-4 py-3 font-semibold text-right">Risk Score</th>
                          <th className="px-4 py-3 font-semibold text-right">Timeline</th>
                          <th className="px-4 py-3 font-semibold text-right">Findings</th>
                          <th className="px-4 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Current Live Row */}
                        {adviceGenerated && currentAudit && (
                          <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${selectedHistoryId === null ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-brand-500 dark:text-brand-400" : ""}`}>
                            <td className="px-4 py-4 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                              <span>Active Diagnostic (Current)</span>
                            </td>
                            <td className="px-4 py-4 text-right">${currentAudit.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className={`px-4 py-4 text-right font-bold ${getRiskScoreColor(currentAudit.overallRiskScore)}`}>
                              {currentAudit.overallRiskScore}/100
                            </td>
                            <td className="px-4 py-4 text-right text-gray-500">{currentAudit.investmentTimeline}</td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-red-500">{currentAudit.concentrationRisks.length} risks</span>
                              {currentAudit.savingsWarnings.length > 0 && (
                                <span className="text-orange-500 ml-1">• {currentAudit.savingsWarnings.length} warnings</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => handleRestoreSnapshot(null)}
                                disabled={selectedHistoryId === null}
                                className={`text-xs font-bold transition-all ${
                                  selectedHistoryId === null
                                    ? "text-gray-400 cursor-default"
                                    : "text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
                                }`}
                              >
                                Viewing
                              </button>
                            </td>
                          </tr>
                        )}

                        {/* History items */}
                        {auditHistory.map((entry) => {
                          const isSelected = selectedHistoryId === entry.id;
                          const hasMultipleAudits = auditHistory.length > 1 || auditHistoryTotalPages > 1;
                          return (
                            <tr
                              key={entry.id}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${isSelected ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-brand-500 dark:text-brand-400" : ""}`}
                            >
                              <td className="px-4 py-4">{formatGmt8(entry.analyzedAt)}</td>
                              <td className="px-4 py-4 text-right">${entry.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className={`px-4 py-4 text-right font-bold ${getRiskScoreColor(entry.overallRiskScore)}`}>
                                {entry.overallRiskScore}/100
                              </td>
                              <td className="px-4 py-4 text-right text-gray-500">{entry.investmentTimeline}</td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-red-500">{entry.concentrationRisks.length} risks</span>
                                {entry.savingsWarnings.length > 0 && (
                                  <span className="text-orange-500 ml-1">• {entry.savingsWarnings.length} warnings</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => handleRestoreSnapshot(entry.id)}
                                  className={`text-xs font-bold transition-all ${
                                    isSelected
                                      ? "text-gray-450 cursor-default"
                                      : "text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
                                  }`}
                                >
                                  {isSelected ? "Viewing" : hasMultipleAudits ? "Restore Snapshot" : "View"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {auditHistoryTotalPages > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                      <button
                        onClick={() => fetchAuditHistory(auditHistoryPage - 1)}
                        disabled={auditHistoryPage === 0}
                        className="text-sm font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-sm font-bold text-gray-400">
                        Page {auditHistoryPage + 1} of {auditHistoryTotalPages}
                      </span>
                      <button
                        onClick={() => fetchAuditHistory(auditHistoryPage + 1)}
                        disabled={auditHistoryPage >= auditHistoryTotalPages - 1}
                        className="text-sm font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Stock Analyzer */}
        {activeTab === "analyzer" && (
          <div className={`transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Ticker Search & Details */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Search Card */}
                <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-brand-500" />
                    On-Demand AI Position Analyzer
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    Search a US stock ticker to generate real-time AI-powered BUY, HOLD, or AVOID trading signals based on technical indicators and company fundamentals.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Enter ticker (e.g. AAPL, NVDA, TSLA)"
                        value={searchSymbol}
                        onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleAnalyzeTicker(searchSymbol)}
                        className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-base font-semibold uppercase text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                        disabled={signalLoading}
                      />
                    </div>
                    <button
                      onClick={() => handleAnalyzeTicker(searchSymbol)}
                      disabled={signalLoading || !searchSymbol.trim()}
                      className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/10 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {signalLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Analyzing...
                        </>
                      ) : (
                        "Run AI Analysis"
                      )}
                    </button>
                  </div>

                  {/* Quick tags */}
                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-semibold text-gray-400">Quick suggestions:</span>
                    {["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "NFLX"].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => handleAnalyzeTicker(sym)}
                        disabled={signalLoading}
                        className="text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 bg-gray-100 dark:bg-gray-800/60 hover:bg-brand-50 dark:hover:bg-brand-500/10 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg transition-all"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading State Simulator */}
                {signalLoading && (
                  <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm space-y-6">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-base font-bold text-gray-800 dark:text-white">AI Scanner Running...</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Analyzing {searchSymbol} with deep contextual screening variables.
                      </p>
                      
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-5">
                        <div 
                          className="h-full bg-brand-500 transition-all duration-300"
                          style={{ width: `${analyzerStep === 1 ? 25 : analyzerStep === 2 ? 50 : analyzerStep === 3 ? 75 : 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-brand-500 font-bold mt-3 animate-pulse">
                        {analyzerStepText}
                      </p>

                      <div className="mt-6 text-left border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/40 space-y-2.5">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 1 ? "bg-emerald-500" : analyzerStep === 1 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 1 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>1. Aggregating price history (Polygon.io API)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 2 ? "bg-emerald-500" : analyzerStep === 2 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 2 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>2. Running local indicator metrics (RSI, SMA, MACD via ta4j)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 3 ? "bg-emerald-500" : analyzerStep === 3 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 3 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>3. Compiling financial profile & market macro metrics</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep === 4 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep === 4 ? "text-brand-500 font-bold" : "text-gray-650 dark:text-gray-400"}>4. Negotiating recommendation prompts (Gemini AI)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State when no active signal */}
                {!activeSignal && !signalLoading && (
                  <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center shadow-sm">
                    <div className="flex justify-center text-gray-300 dark:text-gray-700 mb-4">
                      <SparklesIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Ready for Analysis</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                      Enter a symbol above or select a past scan audit from the history log to view the diagnostic details.
                    </p>
                  </div>
                )}

                {/* Signal Output Result Card */}
                {activeSignal && !signalLoading && (
                  <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 pb-5 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">{activeSignal.symbol} Position Audit</h2>
                           <Badge color="info" variant="light" size="md">US Equity</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Generated on {formatGmt8(activeSignal.analyzedAt)} • Data as of {activeSignal.dataAsOf}
                        </p>
                      </div>

                      {/* Large Action Signal Badge */}
                      <div className="flex items-center gap-3">
                        <div className={`px-5 py-2.5 rounded-xl border text-base font-bold tracking-wider text-center ${
                          activeSignal.signal === "BUY" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : activeSignal.signal === "HOLD" 
                            ? "bg-warning-500/10 text-warning-500 border-warning-500/20" 
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          RECOMMENDED ACTION: {activeSignal.signal}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Rating Gauge */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">Analysis Confidence Score</span>
                        <span className={`text-base font-extrabold ${
                          activeSignal.signal === "BUY" ? "text-emerald-500" : activeSignal.signal === "HOLD" ? "text-warning-500" : "text-red-500"
                        }`}>{activeSignal.confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-850 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            activeSignal.signal === "BUY" ? "bg-emerald-500" : activeSignal.signal === "HOLD" ? "bg-warning-500" : "bg-red-500"
                          }`}
                          style={{ width: `${activeSignal.confidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Technical / Price Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-xs uppercase font-bold text-gray-400 block">Entry Anchor</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-white mt-1 block">
                          ${activeSignal.entryPrice ? activeSignal.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-xs uppercase font-bold text-gray-400 block">Target Target</span>
                        <span className="text-lg font-bold text-emerald-500 mt-1 block">
                          ${activeSignal.targetPrice ? activeSignal.targetPrice.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-xs uppercase font-bold text-gray-400 block">Stop Loss Risk</span>
                        <span className="text-lg font-bold text-red-500 mt-1 block">
                          ${activeSignal.stopLoss ? activeSignal.stopLoss.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-xs uppercase font-bold text-gray-400 block">Risk/Reward Ratio</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-white mt-1 block">
                          {activeSignal.riskRewardRatio ? activeSignal.riskRewardRatio.toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Factors Pill Breakdown Grid */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Model Factor Matrix</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(() => {
                          let factorMap: any = { technical: "NEUTRAL", fundamental: "NEUTRAL", macro: "NEUTRAL", sentiment: "NEUTRAL" };
                          try {
                            if (activeSignal.factors) {
                              factorMap = JSON.parse(activeSignal.factors);
                            }
                          } catch (e) {
                            console.error(e);
                          }
                          
                          const getFactorStyle = (val: string) => {
                            const v = val ? val.toUpperCase() : "";
                            if (v.includes("BULL") || v.includes("STRONG") || v.includes("SUPPORTIVE")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                            if (v.includes("BEAR") || v.includes("WEAK") || v.includes("NEGATIVE")) return "text-red-500 bg-red-500/10 border-red-500/20";
                            return "text-gray-500 bg-gray-500/10 border-gray-500/20";
                          };

                          return Object.entries(factorMap).map(([key, val]: any) => (
                            <div key={key} className="border border-gray-100 dark:border-gray-800 rounded-xl p-2 md:p-3 bg-gray-50/30 dark:bg-gray-900/30 flex items-center justify-between gap-1 md:gap-2 min-w-0">
                              <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase capitalize truncate">{key}</span>
                              <span className={`text-[10px] md:text-xs font-extrabold px-1.5 md:px-2 py-0.5 rounded-md border uppercase whitespace-nowrap ${getFactorStyle(val)}`}>
                                {val}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* AI Reasoning Text */}
                    <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-5">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">AI Diagnostic & Positioning Reasoning</h4>
                      <p className="text-sm text-gray-650 dark:text-gray-300 leading-relaxed font-medium">
                        {activeSignal.reasoning}
                      </p>
                    </div>

                    {/* Horizon */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                      <InfoIcon className="w-3.5 h-3.5" />
                      <span>Target Horizon Timeframe: {activeSignal.timeHorizon || "2-6 weeks"}</span>
                    </div>

                    {/* Disclaimer text */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-xs text-gray-400 leading-normal italic">
                      {activeSignal.disclaimer || "This is algorithmic analysis for educational purposes only. Not financial advice. Always do your own research before trading."}
                    </div>

                  </div>
                )}
              </div>

              {/* Right Column: History */}
              <div className="lg:col-span-4 space-y-6">

                {/* Paginated History table */}
                <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white">Recent Core Scans</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Database Signal Audits</p>
                  </div>

                  {historyLoading ? (
                    <div className="py-8 flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
                    </div>
                  ) : historySignals.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No scan audits available.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {historySignals.map((sig, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (!signalLoading) {
                                setActiveSignal(sig);
                                setSearchSymbol(sig.symbol);
                                showToast(`Loaded historical snapshot for ${sig.symbol}.`, "info");
                              }
                            }}
                            className="border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                          >
                            <div>
                              <span className="font-bold text-sm uppercase text-gray-900 dark:text-white block">{sig.symbol}</span>
                              <span className="text-xs text-gray-400 font-semibold">{formatGmt8(sig.analyzedAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-extrabold px-1.5 py-0.5 rounded-md border ${
                                sig.signal === "BUY" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : sig.signal === "HOLD" ? "text-warning-500 bg-warning-500/10 border-warning-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"
                              }`}>
                                {sig.signal}
                              </span>
                              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{sig.confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {historyTotalPages > 1 && (
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => fetchHistory(historyPage - 1)}
                            disabled={historyPage === 0}
                            className="text-sm font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                          >
                            Prev
                          </button>
                          <span className="text-sm font-bold text-gray-400">
                            Page {historyPage + 1} of {historyTotalPages}
                          </span>
                          <button
                            onClick={() => fetchHistory(historyPage + 1)}
                            disabled={historyPage >= historyTotalPages - 1}
                            className="text-sm font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
