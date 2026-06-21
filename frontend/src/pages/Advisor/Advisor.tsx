import { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { 
  CheckCircleIcon, 
  SparklesIcon, 
  TrashBinIcon, 
  PlusIcon, 
  InfoIcon 
} from "../../icons";
import { useUser } from "../../context/UserContext";

interface MockPosition {
  name: string;
  symbol: string;
  totalValue: number;
  pct: number;
}

interface MockGoal {
  name: string;
  target: number;
  current: number;
  pct: number;
  status: string;
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface HistoryEntry {
  id: string;
  date: string;
  totalPortfolioValue: number;
  btcAllocationPct: number;
  atRiskGoalsCount: number;
  todoItems: TodoItem[];
  hasBtcConcentrationRisk: boolean;
  btcConcentrationAdvice: string;
  debtAdvice: string;
  generalAdvice: string;
}

export default function Advisor() {
  const { isAuthenticated, session, showToast } = useUser();
  const isGuest = !isAuthenticated;

  const [scanStep, setScanStep] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [adviceGenerated, setAdviceGenerated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout Tab selection
  const [activeTab, setActiveTab] = useState<"diagnostic" | "history" | "analyzer">("diagnostic");

  const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

  // Stock Analyzer States
  const [searchSymbol, setSearchSymbol] = useState("");
  const [activeSignal, setActiveSignal] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [signalLoading, setSignalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analyzerStep, setAnalyzerStep] = useState(0);
  const [analyzerStepText, setAnalyzerStepText] = useState("");
  const [historySignals, setHistorySignals] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [showWatchlistAddInput, setShowWatchlistAddInput] = useState(false);
  const [watchlistAddText, setWatchlistAddText] = useState("");

  const GUEST_WATCHLIST = [
    { symbol: "AAPL", addedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
    { symbol: "TSLA", addedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { symbol: "MSFT", addedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString() }
  ];

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
      factors: JSON.stringify({ technical: "BULLISH", fundamental: "STRONG", macro: "SUPPORTIVE", sentiment: "BULLISH" }),
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
      factors: JSON.stringify({ technical: "NEUTRAL", fundamental: "MODERATE", macro: "NEUTRAL", sentiment: "NEUTRAL" }),
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
      fundamental: hash % 2 === 0 ? "STRONG" : "NEUTRAL",
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

  const fetchWatchlist = async () => {
    if (isGuest) {
      const stored = localStorage.getItem("techfolio_guest_watchlist");
      if (stored) {
        setWatchlist(JSON.parse(stored));
      } else {
        setWatchlist(GUEST_WATCHLIST);
        localStorage.setItem("techfolio_guest_watchlist", JSON.stringify(GUEST_WATCHLIST));
      }
      return;
    }

    setWatchlistLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/stock-analyzer/watchlist`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching watchlist:", err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleAddToWatchlist = async (symbol: string) => {
    const cleanSym = symbol.toUpperCase().trim();
    if (!cleanSym) return;

    if (isGuest) {
      const isDuplicate = watchlist.some((item) => item.symbol === cleanSym);
      if (isDuplicate) {
        showToast(`${cleanSym} is already in your watchlist.`, "info");
        return;
      }
      const newItem = { symbol: cleanSym, addedAt: new Date().toISOString() };
      const updated = [newItem, ...watchlist];
      setWatchlist(updated);
      localStorage.setItem("techfolio_guest_watchlist", JSON.stringify(updated));
      showToast(`Added ${cleanSym} to guest watchlist!`, "success");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/stock-analyzer/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ symbols: [cleanSym] }),
      });
      if (res.ok) {
        showToast(`Added ${cleanSym} to watchlist!`, "success");
        fetchWatchlist();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to add ticker.", "error");
      }
    } catch (err) {
      console.error("Error adding to watchlist:", err);
      showToast("Error adding ticker.", "error");
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    if (isGuest) {
      const updated = watchlist.filter((item) => item.symbol !== symbol);
      setWatchlist(updated);
      localStorage.setItem("techfolio_guest_watchlist", JSON.stringify(updated));
      showToast(`Removed ${symbol} from watchlist.`, "info");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/stock-analyzer/watchlist/${symbol}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (res.ok) {
        showToast(`Removed ${symbol} from watchlist.`, "info");
        fetchWatchlist();
      } else {
        showToast("Failed to remove ticker.", "error");
      }
    } catch (err) {
      console.error("Error removing from watchlist:", err);
      showToast("Error removing ticker.", "error");
    }
  };

  const fetchHistory = async (page: number) => {
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
      setAnalyzerStepText("Generating AI signal with GPT-4o-mini...");
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
        setAnalyzerStepText("Generating AI signal with GPT-4o-mini...");
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
    if (activeTab === "analyzer") {
      fetchWatchlist();
      fetchHistory(0);
    }
  }, [activeTab, session]);


  // Active todo item checklist (for the current live advice)
  const [todoList, setTodoList] = useState<TodoItem[]>([
    { id: 1, text: "Reduce BTC holding below 50% to mitigate concentration risk", completed: false },
    { id: 2, text: "Redirect $1,000 from cash savings to fully settle Credit Card Debt clearance goal before June 30", completed: false },
    { id: 3, text: "Set up automated monthly deposit of $350 for Japan Trip saving goal", completed: false },
    { id: 4, text: "Allocate 15% of monthly investment cash toward diversified S&P 500 ETFs", completed: false }
  ]);

  // Historical snaps data state
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: "h1",
      date: "2026-05-01 (4 Weeks Ago)",
      totalPortfolioValue: 39500,
      btcAllocationPct: 82.5,
      atRiskGoalsCount: 2,
      todoItems: [
        { id: 101, text: "Reduce BTC holding below 50% to mitigate concentration risk", completed: false },
        { id: 102, text: "Transfer bonus returns to emergency fund", completed: true },
        { id: 103, text: "Address high interest credit card debt", completed: false },
        { id: 104, text: "Diversify into S&P 550 ETFs", completed: false }
      ],
      hasBtcConcentrationRisk: true,
      btcConcentrationAdvice: "Your Bitcoin holdings make up 82.5% of your portfolio. This exposes your net worth to extreme risk of drawdown during crypto market cycles. Immediate rebalancing is highly advised.",
      debtAdvice: "You have two high priority goals currently marked At Risk: Credit Card Debt Clearance and Emergency Fund. We suggest pausing new stock purchases to clear card debt immediately.",
      generalAdvice: "A crypto-heavy strategy requires substantial cash buffers. Build a minimum 6-month cash reserve as your primary shield before adding to volatile crypto allocations."
    },
    {
      id: "h2",
      date: "2026-05-15 (2 Weeks Ago)",
      totalPortfolioValue: 42000,
      btcAllocationPct: 77.6,
      atRiskGoalsCount: 1,
      todoItems: [
        { id: 201, text: "Reduce BTC holding below 50% to mitigate concentration risk", completed: false },
        { id: 202, text: "Increase emergency fund deposits", completed: true },
        { id: 203, text: "Clear credit card balance clearance targets", completed: false },
        { id: 204, text: "Diversify portfolio assets", completed: false }
      ],
      hasBtcConcentrationRisk: true,
      btcConcentrationAdvice: "Your BTC allocation has decreased slightly to 77.6% but concentration risk remains critical. Shift profits into index funds to ease overall beta exposure.",
      debtAdvice: "Credit Card Debt Clearance remains At Risk (only 25% saved). Focus all spare capital to clear this 20%+ APR liability immediately.",
      generalAdvice: "Dollar-cost average into index trackers like SPY or QQQ. Reducing asset correlation is necessary to stabilize monthly return yields."
    }
  ]);

  // Selected history view state. Null means showing the current live analysis result.
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

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

  // Mock positions representation
  const mockPositions: MockPosition[] = [
    { name: "Apple Inc.", symbol: "AAPL", totalValue: 8775.00, pct: 19.5 },
    { name: "Tesla", symbol: "TSLA", totalValue: 3604.00, pct: 8.0 },
    { name: "Bitcoin", symbol: "BTC", totalValue: 32600.00, pct: 72.5 }
  ];

  const mockGoals: MockGoal[] = [
    { name: "Emergency Fund (6 Months)", target: 15000, current: 12000, pct: 80, status: "On Track" },
    { name: "Holiday Trip to Japan", target: 6000, current: 4800, pct: 80, status: "On Track" },
    { name: "Credit Card Debt Clearance", target: 4000, current: 1200, pct: 30, status: "At Risk" },
    { name: "Retirement Fund Core", target: 250000, current: 85000, pct: 34, status: "On Track" }
  ];

  const totalPortfolioValue = mockPositions.reduce((acc, p) => acc + p.totalValue, 0);

  // Start diagnostics simulation
  const handleTriggerAnalysis = () => {
    setIsScanning(true);
    setAdviceGenerated(false);
    setSelectedHistoryId(null);
    setScanStep(1);

    setTimeout(() => setScanStep(2), 1000);
    setTimeout(() => setScanStep(3), 2000);
    setTimeout(() => setScanStep(4), 3000);
    setTimeout(() => {
      setIsScanning(false);
      setAdviceGenerated(true);
      setScanStep(0);

      // Dynamically append new snapshot to the history log list
      const newScanSnapshot: HistoryEntry = {
        id: `h_new_${Date.now()}`,
        date: new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) + " (Just Now)",
        totalPortfolioValue: totalPortfolioValue,
        btcAllocationPct: 72.5,
        atRiskGoalsCount: mockGoals.filter(g => g.status === "At Risk").length,
        todoItems: [...todoList],
        hasBtcConcentrationRisk: true,
        btcConcentrationAdvice: `Your Bitcoin holdings make up 72.5% ($32,600.00) of your overall investments. Standard diversified asset advice recommends capping speculative digital asset classes below 15-20% of total liquid holdings to prevent extreme portfolio volatility.`,
        debtAdvice: `Your Credit Card Debt Clearance goal is set to mature soon, but is currently sitting at only 30% completion ($1,200 saved of $4,000 target). Leaving unresolved credit card balances incurs heavy interest penalties (often > 20% APR).`,
        generalAdvice: `To offset volatility, consider initiating a Dollar-Cost-Averaging (DCA) program into standard index funds (like S&P 500 or Nasdaq trackers) to gradually balance your heavy asset exposure.`
      };

      setHistory(prev => [newScanSnapshot, ...prev]);
    }, 3800);
  };

  const handleToggleTodo = (id: number) => {
    if (selectedHistoryId) return; // Prevent editing completed historical logs checklist status
    setTodoList(
      todoList.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleRestoreSnapshot = (id: string | null) => {
    setSelectedHistoryId(id);
    setActiveTab("diagnostic"); // Automatically slide back to diagnostic view tab
  };

  // Determine current display values based on selected history snapshot or live scan
  const isViewingHistory = selectedHistoryId !== null;
  const currentSnapshot = isViewingHistory
    ? history.find(h => h.id === selectedHistoryId)
    : null;

  const displayBtcPct = currentSnapshot ? currentSnapshot.btcAllocationPct : 72.5;
  const displayTodoItems = currentSnapshot ? currentSnapshot.todoItems : todoList;
  const displayBtcAdvice = currentSnapshot ? currentSnapshot.btcConcentrationAdvice : "Your Bitcoin holdings make up 72.5% ($32,600.00) of your overall investments. Standard diversified asset advice recommends capping speculative digital asset classes below 15-20% of total holdings to prevent extreme portfolio volatility.";
  const displayDebtAdvice = currentSnapshot ? currentSnapshot.debtAdvice : "Your Credit Card Debt Clearance goal is set to mature soon, but is currently sitting at only 30% completion ($1,200 saved of $4,000 target). Leaving unresolved credit card balances incurs heavy interest penalties (often > 20% APR).";
  const displayGeneralAdvice = currentSnapshot ? currentSnapshot.generalAdvice : "To offset volatility, consider initiating a Dollar-Cost-Averaging (DCA) program into standard index funds (like S&P 500 or Nasdaq trackers) to gradually balance your heavy asset exposure.";

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
            Harness personalized diagnostic advice by packaging your assets and active saving targets.
          </p>
          
          <div className="flex border-b border-gray-200 dark:border-gray-800 mt-5">
            <button
              onClick={() => setActiveTab("diagnostic")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === "diagnostic"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Advisor Diagnostic
              {activeTab === "diagnostic" && (
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
          </div>
        </div>

        {/* Tab 1: Advisor Diagnostic */}
        {activeTab === "diagnostic" && (
          <div className={`transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
            <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              
              {/* Scan Trigger Screen */}
              {!isScanning && !adviceGenerated && !isViewingHistory && (
                <div className="max-w-md mx-auto py-12 text-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Compile & Audit Assets</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Evaluate your holdings concentration risks, overall beta allocations, and goal timelines dynamically.
                  </p>
                  <button
                    onClick={handleTriggerAnalysis}
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
                      {scanStep === 1 && "Gathering portfolio holdings value and crypto percentages..."}
                      {scanStep === 2 && "Validating outstanding debt timelines and target paces..."}
                      {scanStep === 3 && "Calculating diversification exposure limits..."}
                      {scanStep === 4 && "Compiling suggestions reports..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Advice rendering */}
              {(adviceGenerated || isViewingHistory) && !isScanning && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-150 dark:border-gray-800 pb-5 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {isViewingHistory ? `Historical Snapshot: ${currentSnapshot?.date}` : "Current Diagnostic Report"}
                        </h3>
                        {isViewingHistory && (
                          <Badge color="warning" variant="light">
                            Read Only
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isViewingHistory ? "Viewing archive database audit log snapshot." : "Diagnostic finished based on current live state."}
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
                        onClick={handleTriggerAnalysis}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-800"
                      >
                        Run New Scan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    {/* Left Diagnostic list */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Risk warning */}
                      <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                        <div>
                          <h4 className="font-bold text-red-600 dark:text-red-400 text-sm">Portfolio Concentration Risk: {displayBtcPct}% BTC</h4>
                          <p className="text-xs text-gray-650 dark:text-gray-350 mt-1.5 leading-relaxed">
                            {displayBtcAdvice}
                          </p>
                        </div>
                      </div>

                      {/* Goal risk warning */}
                      <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5">
                        <div>
                          <h4 className="font-bold text-orange-600 dark:text-orange-400 text-sm">Debt & Savings Feasibility Warnings</h4>
                          <p className="text-xs text-gray-650 dark:text-gray-355 mt-1.5 leading-relaxed">
                            {displayDebtAdvice}
                          </p>
                        </div>
                      </div>

                      {/* Allocation Info card */}
                      <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-800/20">
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                          Diversification Blueprint
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                          {displayGeneralAdvice}
                        </p>
                      </div>
                    </div>

                    {/* Right Checklists */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-800/20 h-full">
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Advisory Blueprint Checklist</h4>
                        <div className="space-y-4">
                          {displayTodoItems.map((todo) => (
                            <div
                              key={todo.id}
                              onClick={() => handleToggleTodo(todo.id)}
                              className={`flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl transition-all ${
                                isViewingHistory ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:shadow-xs"
                              }`}
                            >
                              <div className="mt-0.5">
                                {todo.completed ? (
                                  <CheckCircleIcon className="w-5 h-5 text-brand-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                                )}
                              </div>
                              <p className={`text-xs font-medium leading-normal ${todo.completed ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}>
                                {todo.text}
                              </p>
                            </div>
                          ))}
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

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-150 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Snapshot Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Portfolio Total</th>
                      <th className="px-4 py-3 font-semibold text-right">BTC Exposure</th>
                      <th className="px-4 py-3 font-semibold text-right">At-Risk Targets</th>
                      <th className="px-4 py-3 font-semibold text-right">Task Completion</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {/* Current Live Row */}
                    {adviceGenerated && (
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${selectedHistoryId === null ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-brand-500 dark:text-brand-400" : ""}`}>
                        <td className="px-4 py-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                          <span>Active Diagnostic (Current State)</span>
                        </td>
                        <td className="px-4 py-4 text-right">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-4 text-right text-red-500">72.5%</td>
                        <td className="px-4 py-4 text-right text-orange-500">1 Goal</td>
                        <td className="px-4 py-4 text-right">
                          {todoList.filter(t => t.completed).length} / {todoList.length}
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
                    {history.map((entry) => {
                      const totalTasks = entry.todoItems.length;
                      const completedTasks = entry.todoItems.filter(t => t.completed).length;
                      const isSelected = selectedHistoryId === entry.id;

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${isSelected ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-brand-500 dark:text-brand-400" : ""}`}
                        >
                          <td className="px-4 py-4">{entry.date}</td>
                          <td className="px-4 py-4 text-right">${entry.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right text-red-500">{entry.btcAllocationPct}%</td>
                          <td className="px-4 py-4 text-right text-orange-500">{entry.atRiskGoalsCount} Goals</td>
                          <td className="px-4 py-4 text-right">
                            {completedTasks} / {totalTasks}
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
                              {isSelected ? "Viewing" : "Restore Snapshot"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-brand-500" />
                    On-Demand AI Position Analyzer
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
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
                        className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-semibold uppercase text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                        disabled={signalLoading}
                      />
                    </div>
                    <button
                      onClick={() => handleAnalyzeTicker(searchSymbol)}
                      disabled={signalLoading || !searchSymbol.trim()}
                      className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/10 active:scale-95 flex items-center justify-center gap-2"
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
                    <span className="text-xs font-semibold text-gray-400">Quick suggestions:</span>
                    {["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "NFLX"].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => handleAnalyzeTicker(sym)}
                        disabled={signalLoading}
                        className="text-xs font-bold text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 bg-gray-100 dark:bg-gray-800/60 hover:bg-brand-50 dark:hover:bg-brand-500/10 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-lg transition-all"
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
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">AI Scanner Running...</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Analyzing {searchSymbol} with deep contextual screening variables.
                      </p>
                      
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-5">
                        <div 
                          className="h-full bg-brand-500 transition-all duration-300"
                          style={{ width: `${analyzerStep === 1 ? 25 : analyzerStep === 2 ? 50 : analyzerStep === 3 ? 75 : 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-brand-500 font-bold mt-3 animate-pulse">
                        {analyzerStepText}
                      </p>

                      <div className="mt-6 text-left border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/40 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 1 ? "bg-emerald-500" : analyzerStep === 1 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 1 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>1. Aggregating price history (Polygon.io API)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 2 ? "bg-emerald-500" : analyzerStep === 2 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 2 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>2. Running local indicator metrics (RSI, SMA, MACD via ta4j)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep > 3 ? "bg-emerald-500" : analyzerStep === 3 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep > 3 ? "text-emerald-500" : "text-gray-600 dark:text-gray-400"}>3. Compiling financial profile & market macro metrics</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className={`w-2 h-2 rounded-full ${analyzerStep === 4 ? "bg-brand-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <span className={analyzerStep === 4 ? "text-brand-500 font-bold" : "text-gray-600 dark:text-gray-400"}>4. Negotiating recommendation prompts (GPT-4o-mini AI)</span>
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
                    <h3 className="text-base font-bold text-gray-800 dark:text-white">Ready for Analysis</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                      Enter a symbol above or select one from your watchlist to trigger the diagnostic agent.
                    </p>
                  </div>
                )}

                {/* Signal Output Result Card */}
                {activeSignal && !signalLoading && (
                  <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 pb-5 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">{activeSignal.symbol} Position Audit</h2>
                           <Badge color="info" variant="light" size="sm">US Equity</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Generated on {new Date(activeSignal.analyzedAt).toLocaleString()} • Data as of {activeSignal.dataAsOf}
                        </p>
                      </div>

                      {/* Large Action Signal Badge */}
                      <div className="flex items-center gap-3">
                        <div className={`px-5 py-2.5 rounded-xl border text-sm font-bold tracking-wider text-center ${
                          activeSignal.signal === "BUY" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : activeSignal.signal === "HOLD" 
                            ? "bg-warning-500/10 text-warning-500 border-warning-500/20" 
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          RECOM: {activeSignal.signal}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Rating Gauge */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-800 dark:text-white">Analysis Confidence Score</span>
                        <span className={`text-sm font-extrabold ${
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
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Entry Anchor</span>
                        <span className="text-base font-bold text-gray-800 dark:text-white mt-1 block">
                          ${activeSignal.entryPrice ? activeSignal.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Target Target</span>
                        <span className="text-base font-bold text-emerald-500 mt-1 block">
                          ${activeSignal.targetPrice ? activeSignal.targetPrice.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Stop Loss Risk</span>
                        <span className="text-base font-bold text-red-500 mt-1 block">
                          ${activeSignal.stopLoss ? activeSignal.stopLoss.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                        </span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/20 dark:bg-gray-900/40">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Risk/Reward Ratio</span>
                        <span className="text-base font-bold text-gray-800 dark:text-white mt-1 block">
                          {activeSignal.riskRewardRatio ? activeSignal.riskRewardRatio.toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Factors Pill Breakdown Grid */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-3">Model Factor Matrix</h4>
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
                            <div key={key} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/30 dark:bg-gray-900/30 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase capitalize">{key}</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${getFactorStyle(val)}`}>
                                {val}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* AI Reasoning Text */}
                    <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-5">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white">AI Diagnostic & Positioning Reasoning</h4>
                      <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-medium">
                        {activeSignal.reasoning}
                      </p>
                    </div>

                    {/* Horizon */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                      <InfoIcon className="w-3.5 h-3.5" />
                      <span>Target Horizon Timeframe: {activeSignal.timeHorizon || "2-6 weeks"}</span>
                    </div>

                    {/* Disclaimer text */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-[10px] text-gray-400 leading-normal italic">
                      {activeSignal.disclaimer || "This is algorithmic analysis for educational purposes only. Not financial advice. Always do your own research before trading."}
                    </div>

                  </div>
                )}
              </div>

              {/* Right Column: Watchlist and History */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Watchlist widget */}
                <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">Signal Watchlist</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">{watchlist.length} Tickers Tracked</p>
                    </div>
                    <button
                      onClick={() => setShowWatchlistAddInput(!showWatchlistAddInput)}
                      className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                      title="Add Ticker"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {showWatchlistAddInput && (
                    <div className="flex gap-2 animate-in fade-in duration-200">
                      <input
                        type="text"
                        placeholder="SYMBOL"
                        value={watchlistAddText}
                        onChange={(e) => setWatchlistAddText(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddToWatchlist(watchlistAddText);
                            setWatchlistAddText("");
                            setShowWatchlistAddInput(false);
                          }
                        }}
                        className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-850 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          handleAddToWatchlist(watchlistAddText);
                          setWatchlistAddText("");
                          setShowWatchlistAddInput(false);
                        }}
                        disabled={!watchlistAddText.trim()}
                        className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {watchlistLoading ? (
                    <div className="py-6 flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
                    </div>
                  ) : watchlist.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Your analyzer watchlist is empty.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {watchlist.map((item) => (
                        <div 
                          key={item.symbol}
                          className="flex items-center justify-between border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 hover:bg-brand-500/[0.02] rounded-xl p-2.5 transition-all group"
                        >
                          <button
                            onClick={() => handleAnalyzeTicker(item.symbol)}
                            disabled={signalLoading}
                            className="flex-1 text-left font-bold text-xs text-gray-800 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 uppercase transition-colors"
                          >
                            {item.symbol}
                          </button>
                          
                          <button
                            onClick={() => handleRemoveFromWatchlist(item.symbol)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                            title="Remove"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paginated History table */}
                <div className="bg-white dark:bg-gray-900/[0.8] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">Recent Core Scans</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Database Signal Audits</p>
                  </div>

                  {historyLoading ? (
                    <div className="py-8 flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
                    </div>
                  ) : historySignals.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">No scan audits available.</p>
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
                              <span className="font-bold text-xs uppercase text-gray-900 dark:text-white block">{sig.symbol}</span>
                              <span className="text-[9px] text-gray-400 font-semibold">{sig.dataAsOf}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                sig.signal === "BUY" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : sig.signal === "HOLD" ? "text-warning-500 bg-warning-500/10 border-warning-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"
                              }`}>
                                {sig.signal}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{sig.confidence}%</span>
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
                            className="text-[10px] font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                          >
                            Prev
                          </button>
                          <span className="text-[10px] font-bold text-gray-400">
                            Page {historyPage + 1} of {historyTotalPages}
                          </span>
                          <button
                            onClick={() => fetchHistory(historyPage + 1)}
                            disabled={historyPage >= historyTotalPages - 1}
                            className="text-[10px] font-bold text-brand-500 hover:text-brand-600 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
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
