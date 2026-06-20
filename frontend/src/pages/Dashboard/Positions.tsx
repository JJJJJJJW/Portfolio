import React, { useState, useEffect, useRef, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import type { GuestPosition, GuestTransaction } from "../../data/guestData";
import { Toast } from "../../components/common/Toast";
import AutocompleteSearch from "../../components/common/AutocompleteSearch";

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
  const { positions, transactions, addTransaction, refetch, updateAssetPrice } = usePortfolioData();

  // Price Edit states for Custom Assets
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState("");
  const [isPriceSubmitting, setIsPriceSubmitting] = useState(false);

  // Form Inputs
  const [formSymbol, setFormSymbol] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState("");
  const [formCurrency, setFormCurrency] = useState<"USD" | "MYR">("USD");
  const [isManualCurrency, setIsManualCurrency] = useState(false);
  const [formCategory, setFormCategory] = useState("STOCK");
  const [formIsCustom, setFormIsCustom] = useState(false);
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [formUseCustomFx, setFormUseCustomFx] = useState(false);
  const [formCustomFxRate, setFormCustomFxRate] = useState("");

  useEffect(() => {
    setFormError("");
  }, [formSymbol, formQty, formPrice, transactionType]);

  useEffect(() => {
    if (!isManualCurrency && formSymbol) {
      setFormCurrency(isKlse(formSymbol) ? "MYR" : "USD");
    }
  }, [formSymbol, isManualCurrency]);

  useEffect(() => {
    if (formSymbol) {
      const s = formSymbol.trim().toUpperCase();
      if (s.includes("/") || s.endsWith("USD") || ["BTC", "ETH", "SOL", "DOGE"].includes(s)) {
        setFormCategory("CRYPTO");
      } else {
        setFormCategory("STOCK");
      }
    }
  }, [formSymbol]);

  useEffect(() => {
    setIsEditingPrice(false);
    setTempPrice("");
  }, [selectedPosition]);

  const handleSavePrice = async () => {
    if (!selectedPosition) return;
    const priceNum = parseFloat(tempPrice);
    if (isNaN(priceNum) || priceNum < 0) return;

    setIsPriceSubmitting(true);
    try {
      await updateAssetPrice(selectedPosition.id, priceNum);
      setSelectedPosition((prev) => {
        if (!prev) return null;
        const totalValue = prev.quantity * priceNum;
        const pl = totalValue - (prev.quantity * prev.avgPrice);
        return {
          ...prev,
          currentPrice: priceNum,
          totalValue: parseFloat(totalValue.toFixed(2)),
          pl: parseFloat(pl.toFixed(2))
        };
      });
      setIsEditingPrice(false);
    } catch (err) {
      console.error("Failed to save custom asset price:", err);
    } finally {
      setIsPriceSubmitting(false);
    }
  };

  const handleSellFromDetails = (pos: GuestPosition) => {
    setFormSymbol(pos.symbol);
    setFormPrice(pos.currentPrice.toFixed(2));
    setTransactionType("sell");
    setFormCurrency(pos.currency || "USD");
    setIsManualCurrency(true);
    setFormCategory(pos.category || "STOCK");
    setIsModalOpen(true);
    setSelectedPosition(null);
  };

  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "MYR">("USD");
  const [usdToMyrRate, setUsdToMyrRate] = useState<number>(4.70);
  const [usdToMyrFetchedAt, setUsdToMyrFetchedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/market/exchange-rate?symbol=USD/MYR`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rate > 0) {
          setUsdToMyrRate(data.rate);
          setUsdToMyrFetchedAt(data.fetchedAt);
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
  const rmPositions = positions.filter(p => p.currency === "MYR");
  const usdPositions = positions.filter(p => p.currency === "USD");

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

    let symbolUpper = formSymbol.toUpperCase().trim();

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

    const hasCustomFx = !isKlse(symbolUpper) && formCurrency === "MYR" && formUseCustomFx && formCustomFxRate;
    const customFxVal = hasCustomFx ? parseFloat(formCustomFxRate) : undefined;

    // Create Transaction
    const newTx: GuestTransaction = {
      id: Date.now().toString(),
      date: formDate,
      type: transactionType,
      symbol: symbolUpper,
      quantity: qtyNum,
      price: priceNum,
      totalAmount: totalAmt,
      currency: formCurrency,
      category: formCategory,
      isCustom: formIsCustom,
      currentPrice: formIsCustom ? parseFloat(formCurrentPrice) : priceNum,
      customExchangeRate: customFxVal
    };

    // Determine asset native currency
    const assetNativeCurrency = formIsCustom ? formCurrency : (isKlse(symbolUpper) ? "MYR" : "USD");

    // Convert transaction price/amount to asset native currency for Guest mode calculations
    let nativePrice = priceNum;
    let nativeAmount = totalAmt;

    if (formCurrency === "MYR" && assetNativeCurrency === "USD") {
      const rate = customFxVal || usdToMyrRate;
      nativePrice = priceNum / rate;
      nativeAmount = totalAmt / rate;
    } else if (formCurrency === "USD" && assetNativeCurrency === "MYR") {
      const rate = customFxVal || usdToMyrRate;
      nativePrice = priceNum * rate;
      nativeAmount = totalAmt * rate;
    }

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
          newAvg = ((p.quantity * p.avgPrice) + nativeAmount) / newQty;
        } else {
          newQty = Math.max(0, p.quantity - qtyNum);
        }

        const newCurrentPrice = formIsCustom ? parseFloat(formCurrentPrice) : p.currentPrice;
        const newTotalVal = newQty * newCurrentPrice;
        const newPl = newTotalVal - (newQty * newAvg);

        updated[existingIdx] = {
          ...p,
          quantity: newQty,
          avgPrice: parseFloat(newAvg.toFixed(4)),
          currentPrice: newCurrentPrice,
          totalValue: parseFloat(newTotalVal.toFixed(2)),
          pl: parseFloat(newPl.toFixed(2)),
          isCustom: formIsCustom || p.isCustom
        };
      } else {
        // Create new position
        if (transactionType === "buy") {
          const newCurrentPrice = formIsCustom ? parseFloat(formCurrentPrice) : nativePrice;
          updated.push({
            id: Date.now().toString(),
            name: symbolUpper,
            symbol: symbolUpper,
            quantity: qtyNum,
            avgPrice: parseFloat(nativePrice.toFixed(4)),
            currentPrice: newCurrentPrice,
            totalValue: parseFloat((qtyNum * newCurrentPrice).toFixed(2)),
            pl: parseFloat(((newCurrentPrice - nativePrice) * qtyNum).toFixed(2)),
            isCustom: formIsCustom,
            category: formCategory,
            currency: assetNativeCurrency
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
    setFormCategory("STOCK");
    setFormIsCustom(false);
    setFormCurrentPrice("");
    setFormUseCustomFx(false);
    setFormCustomFxRate("");
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
              <AutocompleteSearch
                positions={positions}
                onAddPosition={(symbol, price) => {
                  setFormSymbol(symbol);
                  setFormPrice(price.toFixed(2));
                  setTransactionType("buy");
                  setFormCurrency(isKlse(symbol) ? "MYR" : "USD");
                  setIsManualCurrency(false);

                  const s = symbol.toUpperCase();
                  if (s.includes("/") || s.endsWith("USD") || ["BTC", "ETH", "SOL", "DOGE"].includes(s)) {
                    setFormCategory("CRYPTO");
                  } else {
                    setFormCategory("STOCK");
                  }

                  setIsModalOpen(true);
                }}
                usdToMyrRate={usdToMyrRate}
              />

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
                    {usdToMyrFetchedAt && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-normal">
                        As of {new Date(usdToMyrFetchedAt).toLocaleString()}
                      </span>
                    )}
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
                              <th className="px-4 py-3 font-semibold text-right">Current Price Per Share</th>
                              <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
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
                                  <div className="flex flex-col">
                                    <span>{pos.name}</span>
                                    {pos.category && (
                                      <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider mt-0.5">
                                        {pos.category.replace("_", " ")}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">{pos.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">${pos.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right">${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right">${(pos.quantity * pos.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                              <th className="px-4 py-3 font-semibold text-right">Current Price Per Share</th>
                              <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
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
                                  <div className="flex flex-col">
                                    <span>{pos.name}</span>
                                    {pos.category && (
                                      <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider mt-0.5">
                                        {pos.category.replace("_", " ")}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">{pos.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">RM {pos.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>        
                                <td className="px-4 py-4 text-right">RM {pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-4 text-right">RM {(pos.quantity * pos.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                          <td className="px-4 py-4 text-right">
                            {tx.currency === "MYR" ? "RM " : "$"}
                            {tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {tx.customExchangeRate && (
                              <span className="text-[10px] text-gray-400 block font-normal mt-0.5" title="Custom Exchange Rate">
                                (FX: {tx.customExchangeRate.toFixed(2)})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                            {tx.currency === "MYR" ? "RM " : "$"}{tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            onClick={() => {
              setFormSymbol("");
              setFormQty("");
              setFormPrice("");
              setFormDate(new Date().toISOString().split('T')[0]);
              setFormCurrency(selectedCurrency);
              setIsManualCurrency(false);
              setFormCategory("STOCK");
              setFormIsCustom(false);
              setFormCurrentPrice("");
              setFormUseCustomFx(false);
              setFormCustomFxRate("");
              setIsModalOpen(true);
            }}
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
                <div className="flex gap-2 items-center mt-1">
                  <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded">
                    {selectedPosition.symbol}
                  </span>
                  {selectedPosition.category && (
                    <span className="inline-block bg-brand-500/10 text-brand-500 text-xs font-semibold px-2 py-0.5 rounded uppercase">
                      {selectedPosition.category.replace("_", " ")}
                    </span>
                  )}
                </div>
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
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedPosition.currency === "MYR" ? "RM " : "$"}{selectedPosition.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Current Price Per Share</span>
                  {isEditingPrice ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="relative flex-1 min-w-[90px]">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs font-medium pointer-events-none">
                          {selectedPosition.currency === "MYR" ? "RM" : "$"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={isPriceSubmitting}
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-full pl-8 pr-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSavePrice();
                            if (e.key === "Escape") setIsEditingPrice(false);
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePrice}
                        disabled={isPriceSubmitting}
                        className="p-1 bg-brand-500 hover:bg-brand-600 text-white rounded transition-colors disabled:opacity-50"
                        title="Save Price"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPrice(false)}
                        disabled={isPriceSubmitting}
                        className="p-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedPosition.currency === "MYR" ? "RM " : "$"}
                        {selectedPosition.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {selectedPosition.isCustom && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempPrice(selectedPosition.currentPrice.toString());
                            setIsEditingPrice(true);
                          }}
                          className="text-gray-400 hover:text-brand-500 transition-colors p-1"
                          title="Edit Current Price"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Total Value</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedPosition.currency === "MYR" ? "RM " : "$"}{selectedPosition.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Profit / Loss</span>
                  <span className={`text-lg font-bold ${selectedPosition.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                    {selectedPosition.pl >= 0 ? "+" : ""}{selectedPosition.currency === "MYR" ? "RM " : "$"}{selectedPosition.pl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            <td className="px-4 py-3 text-right">
                              {tx.currency === "MYR" ? "RM " : "$"}
                              {tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              {tx.customExchangeRate && (
                                <span className="text-[10px] text-gray-400 block font-normal mt-0.5" title="Custom Exchange Rate">
                                  (FX: {tx.customExchangeRate.toFixed(2)})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {tx.currency === "MYR" ? "RM " : "$"}{tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

              {/* Asset Name & Currency */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Symbol / Name</label>
                  <input
                    type="text"
                    placeholder="e.g. AAPL"
                    required
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFormCurrency("USD");
                        setIsManualCurrency(true);
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                        formCurrency === "USD"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormCurrency("MYR");
                        setIsManualCurrency(true);
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                        formCurrency === "MYR"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      MYR
                    </button>
                  </div>
                </div>
              </div>

              {/* Asset Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-medium"
                >
                  <option value="STOCK">Stock</option>
                  <option value="CRYPTO">Crypto</option>
                  <option value="REAL_ESTATE">Real Estate</option>
                  <option value="BOND">Bond</option>
                  <option value="MUTUAL_FUND">Mutual Fund</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Custom Asset Toggle */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="formIsCustom"
                  checked={formIsCustom}
                  onChange={(e) => {
                    setFormIsCustom(e.target.checked);
                    if (e.target.checked) {
                      setFormCategory("OTHER");
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="formIsCustom" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Custom Asset (Not listed on exchanges)
                </label>
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
                    {formIsCustom ? `Buy Price per unit (${formCurrency === "MYR" ? "RM" : "USD"})` : `Price per share (${formCurrency === "MYR" ? "RM" : "USD"})`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium pointer-events-none text-sm">
                      {formCurrency === "MYR" ? "RM" : "$"}
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

              {/* Current Price (Only for Custom Assets) */}
              {formIsCustom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Price per unit ({formCurrency === "MYR" ? "RM" : "USD"})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium pointer-events-none text-sm">
                      {formCurrency === "MYR" ? "RM" : "$"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formCurrentPrice}
                      onChange={(e) => setFormCurrentPrice(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                    />
                  </div>
                </div>
              )}

              {/* Custom Exchange Rate (Only for US assets purchased using MYR) */}
              {!isKlse(formSymbol) && formCurrency === "MYR" && (
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-800/20 p-3 rounded-lg border border-gray-150 dark:border-gray-850">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="formUseCustomFx"
                      checked={formUseCustomFx}
                      onChange={(e) => {
                        setFormUseCustomFx(e.target.checked);
                        if (!e.target.checked) {
                          setFormCustomFxRate("");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="formUseCustomFx" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                      Use Custom Exchange Rate
                    </label>
                  </div>
                  {formUseCustomFx && (
                    <div className="animate-in fade-in duration-200">
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Custom FX Rate (1 USD = ? MYR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="e.g. 4.72"
                        value={formCustomFxRate}
                        onChange={(e) => setFormCustomFxRate(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

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
