import React, { useState, useEffect, useRef, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import type { GuestPosition, GuestTransaction } from "../../data/guestData";
import { Toast } from "../../components/common/Toast";

const isKlse = (symbol: string) => {
  const s = symbol.trim().toUpperCase();
  return s.endsWith(".KL") || s.endsWith(".XKLS") || s.endsWith(".KLSE");
};

export default function Positions() {
  const [activeTab, setActiveTab] = useState("positions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<GuestPosition | null>(null);
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the portfolio data hook (guest vs auth)
  const { positions, transactions, addTransaction, refetch } = usePortfolioData();

  // Form Inputs
  const [formSymbol, setFormSymbol] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFormError("");
  }, [formSymbol, formQty, formPrice, transactionType]);

  const handleSellFromDetails = (pos: GuestPosition) => {
    setFormSymbol(pos.symbol);
    setFormPrice(pos.currentPrice.toFixed(2));
    setTransactionType("sell");
    setIsModalOpen(true);
    setSelectedPosition(null);
  };

  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "MYR">("USD");
  const [usdToMyrRate, setUsdToMyrRate] = useState<number>(4.70);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/assets/price?symbol=USD/MYR`);
      if (res.ok) {
        const price = await res.json();
        if (price > 0) {
          setUsdToMyrRate(price);
        }
      }
    } catch (err) {
      console.error("Failed to fetch USD/MYR exchange rate:", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPosition(null);
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        fetchExchangeRate()
      ]);
      setToast({ message: "Portfolio prices and exchange rates refreshed successfully!", type: "success" });
    } catch (err) {
      console.error("Refresh failed:", err);
      setToast({ message: "Failed to refresh portfolio prices. Please try again.", type: "error" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.includes(".")) {
      const [intPart, decPart] = val.split(".");
      if (decPart.length > 2) {
        val = `${intPart}.${decPart.substring(0, 2)}`;
      }
    }
    setFormPrice(val);
  };

  // Separate positions by currency
  const rmPositions = positions.filter(p => isKlse(p.symbol));
  const usdPositions = positions.filter(p => !isKlse(p.symbol));

  // Compute Subtotals
  const rmTotalValue = rmPositions.reduce((sum, p) => sum + p.totalValue, 0);
  const rmTotalPl = rmPositions.reduce((sum, p) => sum + p.pl, 0);

  const usdTotalValue = usdPositions.reduce((sum, p) => sum + p.totalValue, 0);
  const usdTotalPl = usdPositions.reduce((sum, p) => sum + p.pl, 0);

  // Compute Grand Totals in Selected Currency
  const grandTotalValue = selectedCurrency === "USD"
    ? usdTotalValue + (rmTotalValue / usdToMyrRate)
    : (usdTotalValue * usdToMyrRate) + rmTotalValue;

  const grandTotalPl = selectedCurrency === "USD"
    ? usdTotalPl + (rmTotalPl / usdToMyrRate)
    : (usdTotalPl * usdToMyrRate) + rmTotalPl;

  // Ticker Search States & Logic
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    symbol: string;
    price: number;
    hasPosition: boolean;
    positionDetails?: {
      quantity: number;
      avgPrice: number;
      totalValue: number;
      pl: number;
    };
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const triggerSearch = useCallback(async (symbol: string) => {
    const symbolUpper = symbol.trim().toUpperCase();
    if (!symbolUpper) return;

    setSearchLoading(true);
    setSearchError("");

    try {
      const res = await fetch(`${API_URL}/api/v1/assets/price?symbol=${symbolUpper}`);
      if (!res.ok) {
        throw new Error("Symbol not found or network error");
      }
      const price = await res.json();
      if (price === 0.0) {
        throw new Error("Symbol not found or API limits exceeded");
      }

      const matchedPos = positions.find(p => p.symbol.toUpperCase() === symbolUpper);

      if (matchedPos) {
        setSearchResult({
          symbol: symbolUpper,
          price: price,
          hasPosition: true,
          positionDetails: {
            quantity: matchedPos.quantity,
            avgPrice: matchedPos.avgPrice,
            totalValue: matchedPos.quantity * price,
            pl: (price - matchedPos.avgPrice) * matchedPos.quantity
          }
        });
      } else {
        setSearchResult({
          symbol: symbolUpper,
          price: price,
          hasPosition: false
        });
      }
    } catch (err: any) {
      console.error("Search failed:", err);
      setSearchError(err.message || "Failed to load price. Verify symbol or API key.");
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  }, [API_URL, positions]);

  const handleSearchTicker = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(searchQuery);
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResult(null);
      setSearchError("");
      return;
    }

    const delayDebounce = setTimeout(() => {
      triggerSearch(query);
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, triggerSearch]);

  const handleAddFromSearch = () => {
    if (!searchResult) return;
    setFormSymbol(searchResult.symbol);
    setFormPrice(searchResult.price.toFixed(2));
    setTransactionType("buy");
    setIsModalOpen(true);
  };

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

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    const symbolUpper = formSymbol.toUpperCase().trim();
    const qtyNum = parseFloat(formQty);
    const priceNum = parseFloat(formPrice);
    const totalAmt = qtyNum * priceNum;

    if (!symbolUpper || isNaN(qtyNum) || isNaN(priceNum)) return;

    if (transactionType === "sell") {
      const existingPos = positions.find(p => p.symbol.toUpperCase() === symbolUpper);
      if (!existingPos || existingPos.quantity <= 0) {
        setFormError(`You do not own any shares of ${symbolUpper} to sell.`);
        return;
      }
      if (qtyNum > existingPos.quantity) {
        setFormError(`Insufficient shares. You only own ${existingPos.quantity.toFixed(2)} shares of ${symbolUpper}.`);
        return;
      }
    }

    // Create Transaction
    const newTx: GuestTransaction = {
      id: Date.now().toString(),
      date: formDate,
      type: transactionType,
      symbol: symbolUpper,
      quantity: qtyNum,
      price: priceNum,
      totalAmount: totalAmt
    };

    // Compute updated positions
    const updatedPositions = (() => {
      const existingIdx = positions.findIndex(p => p.symbol.toUpperCase() === symbolUpper);
      const updated = [...positions];

      if (existingIdx > -1) {
        const p = updated[existingIdx];
        let newQty = p.quantity;
        let newAvg = p.avgPrice;

        if (transactionType === "buy") {
          newQty = p.quantity + qtyNum;
          newAvg = ((p.quantity * p.avgPrice) + totalAmt) / newQty;
        } else {
          newQty = Math.max(0, p.quantity - qtyNum);
        }

        const newTotalVal = newQty * priceNum;
        const newPl = newTotalVal - (newQty * newAvg);

        updated[existingIdx] = {
          ...p,
          quantity: newQty,
          avgPrice: parseFloat(newAvg.toFixed(2)),
          currentPrice: priceNum,
          totalValue: parseFloat(newTotalVal.toFixed(2)),
          pl: parseFloat(newPl.toFixed(2))
        };
      } else {
        // Create new position
        if (transactionType === "buy") {
          updated.push({
            id: Date.now().toString(),
            name: symbolUpper,
            symbol: symbolUpper,
            quantity: qtyNum,
            avgPrice: priceNum,
            currentPrice: priceNum,
            totalValue: totalAmt,
            pl: 0
          });
        }
      }
      return updated;
    })();

    addTransaction(newTx, updatedPositions);

    // Reset Form
    setIsModalOpen(false);
    setFormSymbol("");
    setFormQty("");
    setFormPrice("");
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <>
      <PageMeta title="Positions & Transactions" description="Manage your investment positions and transactions." />

      <div ref={containerRef} className="space-y-6 relative h-full">
        {/* Page Header & Tabs */}
        <div className={`transition-all duration-1000 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Investment Tracking</h1>
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("positions")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === "positions"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
            >
              Positions
              {activeTab === "positions" && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-brand-500 rounded-t-lg" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === "transactions"
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
            >
              Transactions
              {activeTab === "transactions" && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-brand-500 rounded-t-lg" />
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-sm min-h-[500px] transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          {activeTab === "positions" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Ticker Search Widget */}
              <div className="bg-slate-50 dark:bg-slate-800/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="text-xs font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Live Ticker Lookup
                </h3>
                <form onSubmit={handleSearchTicker} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter symbol (e.g. AAPL, 1055.KL)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-medium uppercase"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-700/50 text-white font-semibold rounded-lg transition-colors shadow-md shadow-brand-500/10 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {searchLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching...
                      </>
                    ) : (
                      "Lookup"
                    )}
                  </button>
                </form>

                {/* Search Result Card */}
                {searchResult && (
                  <div className="mt-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{searchResult.symbol}</span>
                          {searchResult.hasPosition ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                              In Portfolio
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-inset ring-red-500/20">
                              Not in Portfolio
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                          {isKlse(searchResult.symbol) ? "RM " : "$"}{searchResult.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAddFromSearch}
                          className="px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 dark:text-brand-400 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Position
                        </button>
                      </div>
                    </div>

                    {/* Matched Position Details */}
                    {searchResult.hasPosition && searchResult.positionDetails && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Your Holding</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {searchResult.positionDetails.quantity.toFixed(4).replace(/\.?0+$/, "")} shares
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Avg Cost</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {isKlse(searchResult.symbol) ? "RM " : "$"}{searchResult.positionDetails.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Market Value</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {isKlse(searchResult.symbol) ? "RM " : "$"}{searchResult.positionDetails.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Total P/L</span>
                          <span className={`text-sm font-bold ${searchResult.positionDetails.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                            {searchResult.positionDetails.pl >= 0 ? "+" : ""}{isKlse(searchResult.symbol) ? "RM " : "$"}{searchResult.positionDetails.pl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {searchError && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-lg p-3 text-sm font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {searchError}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Current Portfolio</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click on any asset to view performance details and transaction history.</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Currency Toggle */}
                  <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-gray-950">
                    <button
                      onClick={() => setSelectedCurrency("USD")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                        selectedCurrency === "USD"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      USD Display
                    </button>
                    <button
                      onClick={() => setSelectedCurrency("MYR")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                        selectedCurrency === "MYR"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      MYR Display
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Refresh Live Prices"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 21v-5h-.581m0 0a8.003 8.003 0 01-15.357-2"
                      />
                    </svg>
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Grand Total Portfolio Summary Card */}
              {positions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 dark:bg-slate-800/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Total Portfolio Value</span>
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {selectedCurrency === "USD" ? "$" : "RM "}
                      {grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Total Profit / Loss</span>
                    <span className={`text-2xl font-extrabold ${grandTotalPl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                      {grandTotalPl >= 0 ? "+" : ""}
                      {selectedCurrency === "USD" ? "$" : "RM "}
                      {grandTotalPl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Exchange Rate</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      1 USD = RM {usdToMyrRate.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {positions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No positions yet. Add a transaction to get started.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* USD Asset Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider">
                        🇺🇸 Assets
                      </h3>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Subtotal: ${usdTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} | P/L:{" "}
                        <span className={usdTotalPl >= 0 ? "text-brand-500" : "text-red-500"}>
                          {usdTotalPl >= 0 ? "+" : ""}${usdTotalPl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>

                    {usdPositions.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-600 italic py-4">No US Dollar assets held.</p>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 dark:text-gray-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Asset</th>
                              <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                              <th className="px-4 py-3 font-semibold text-right">Avg Price</th>
                              <th className="px-4 py-3 font-semibold text-right">Current Price</th>
                              <th className="px-4 py-3 font-semibold text-right">Total Value</th>
                              <th className="px-4 py-3 font-semibold text-right">P/L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usdPositions.map((pos, idx) => (
                              <tr
                                key={pos.id}
                                onClick={() => setSelectedPosition(pos)}
                                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                                  idx === usdPositions.length - 1 ? "border-b-0" : ""
                                }`}
                              >
                                <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                  {pos.name} ({pos.symbol})
                                </td>
                                <td className="px-4 py-4 text-right">{pos.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">${pos.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right">${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                                  ${pos.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`px-4 py-4 text-right font-medium ${pos.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                                  {pos.pl >= 0 ? "+" : ""}${pos.pl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* MYR Asset Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider">
                        🇲🇾 Assets
                      </h3>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Subtotal: RM {rmTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} | P/L:{" "}
                        <span className={rmTotalPl >= 0 ? "text-brand-500" : "text-red-500"}>
                          {rmTotalPl >= 0 ? "+" : ""}RM {rmTotalPl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>

                    {rmPositions.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-600 italic py-4">No Malaysian Ringgit assets held.</p>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 dark:text-gray-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Asset</th>
                              <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                              <th className="px-4 py-3 font-semibold text-right">Avg Price</th>
                              <th className="px-4 py-3 font-semibold text-right">Current Price</th>
                              <th className="px-4 py-3 font-semibold text-right">Total Value</th>
                              <th className="px-4 py-3 font-semibold text-right">P/L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rmPositions.map((pos, idx) => (
                              <tr
                                key={pos.id}
                                onClick={() => setSelectedPosition(pos)}
                                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                                  idx === rmPositions.length - 1 ? "border-b-0" : ""
                                }`}
                              >
                                <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                  {pos.name} ({pos.symbol})
                                </td>
                                <td className="px-4 py-4 text-right">{pos.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">RM {pos.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right">RM {pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                                  RM {pos.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`px-4 py-4 text-right font-medium ${pos.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                                  {pos.pl >= 0 ? "+" : ""}RM {pos.pl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Transaction History</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No transactions yet. Add your first transaction to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 dark:text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Asset</th>
                        <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                        <th className="px-4 py-3 font-semibold text-right">Price</th>
                        <th className="px-4 py-3 font-semibold text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr
                          key={tx.id}
                          className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            idx === transactions.length - 1 ? "border-b-0" : ""
                          }`}
                        >
                          <td className="px-4 py-4">{tx.date}</td>
                          <td className="px-4 py-4">
                            {tx.type === "buy" ? (
                              <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-500 ring-1 ring-inset ring-brand-500/20">
                                Buy
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
                                Sell
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{tx.symbol}</td>
                          <td className="px-4 py-4 text-right">{tx.quantity.toFixed(4).replace(/\.?0+$/, "")}</td>
                          <td className="px-4 py-4 text-right">{isKlse(tx.symbol) ? "RM " : "$"}{tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                            {isKlse(tx.symbol) ? "RM " : "$"}{tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button (FAB) for Add Position/Transaction */}
        <div className={`fixed bottom-10 right-10 z-50 transition-all duration-1000 delay-500 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="group flex h-14 items-center rounded-full bg-brand-500 p-4 text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:pr-6 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
            title="Add Transaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-xs group-hover:ml-2 font-medium">
              Add Transaction
            </span>
          </button>
        </div>
      </div>

      {/* Position Details Modal */}
      {selectedPosition && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPosition(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Asset Details: {selectedPosition.name}
                </h3>
                <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded mt-1">
                  {selectedPosition.symbol}
                </span>
              </div>
              <div className="flex items-center gap-3">
                
                <button
                  onClick={() => setSelectedPosition(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Asset Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Quantity</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedPosition.quantity.toFixed(4).replace(/\.?0+$/, "")}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Avg Buy Price</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{isKlse(selectedPosition.symbol) ? "RM " : "$"}{selectedPosition.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Current Price</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{isKlse(selectedPosition.symbol) ? "RM " : "$"}{selectedPosition.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Total Value</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{isKlse(selectedPosition.symbol) ? "RM " : "$"}{selectedPosition.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Profit / Loss</span>
                  <span className={`text-lg font-bold ${selectedPosition.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                    {selectedPosition.pl >= 0 ? "+" : ""}{isKlse(selectedPosition.symbol) ? "RM " : "$"}{selectedPosition.pl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Specific to Asset */}
              <div>
              <div className="flex justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Transaction History for {selectedPosition.symbol}
                </h4>
                <button
                  type="button"
                  onClick={() => handleSellFromDetails(selectedPosition)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-red-500/10 active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sell Asset
                </button>
              </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-left text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 dark:text-gray-500">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Date</th>
                        <th className="px-4 py-2.5 font-semibold">Type</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Quantity</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Price</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {transactions
                        .filter(t => t.symbol.toUpperCase() === selectedPosition.symbol.toUpperCase())
                        .map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">{tx.date}</td>
                            <td className="px-4 py-3">
                              {tx.type === "buy" ? (
                                <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-500 ring-1 ring-inset ring-brand-500/20">
                                  Buy
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
                                  Sell
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              {tx.quantity.toFixed(4).replace(/\.?0+$/, "")}
                            </td>
                            <td className="px-4 py-3 text-right">{isKlse(selectedPosition.symbol) ? "RM " : "$"}{tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {isKlse(selectedPosition.symbol) ? "RM " : "$"}{tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      {transactions.filter(t => t.symbol.toUpperCase() === selectedPosition.symbol.toUpperCase()).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-600 font-medium">
                            No transactions recorded for this asset yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Transaction</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="p-5 space-y-4" onSubmit={handleAddTransaction}>
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-lg p-3 text-sm font-medium animate-in fade-in duration-200">
                  {formError}
                </div>
              )}
              {/* Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionType("buy")}
                    className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${transactionType === "buy"
                        ? "border-brand-500 bg-brand-500/10 text-brand-500"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType("sell")}
                    className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${transactionType === "sell"
                        ? "border-orange-500 bg-orange-500/10 text-orange-500"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              {/* Asset Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Symbol / Name</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL"
                  required
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                  />
                </div>
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price per share ({isKlse(formSymbol) ? "RM" : "USD"})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium pointer-events-none text-sm">
                      {isKlse(formSymbol) ? "RM" : "$"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formPrice}
                      onChange={handlePriceChange}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                    />
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-brand-500/30">
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
