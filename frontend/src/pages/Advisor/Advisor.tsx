import { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { CheckCircleIcon } from "../../icons";

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
  const [scanStep, setScanStep] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [adviceGenerated, setAdviceGenerated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout Tab selection
  const [activeTab, setActiveTab] = useState<"diagnostic" | "history">("diagnostic");

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
      </div>
    </>
  );
}
