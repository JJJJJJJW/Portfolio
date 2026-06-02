import React, { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";

interface Position {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  pl: number;
}

interface Transaction {
  id: string;
  date: string;
  type: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

export default function Positions() {
  const [activeTab, setActiveTab] = useState("positions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic States for Interactive Demo
  const [positions, setPositions] = useState<Position[]>([
    { id: "1", name: "Apple Inc.", symbol: "AAPL", quantity: 50.00, avgPrice: 150.00, currentPrice: 175.50, totalValue: 8775.00, pl: 1275.00 },
    { id: "2", name: "Tesla", symbol: "TSLA", quantity: 20.00, avgPrice: 200.00, currentPrice: 180.20, totalValue: 3604.00, pl: -396.00 },
    { id: "3", name: "Bitcoin", symbol: "BTC", quantity: 0.50, avgPrice: 60000.00, currentPrice: 65200.00, totalValue: 32600.00, pl: 2600.00 }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", date: "2026-05-15", type: "buy", symbol: "BTC", quantity: 0.10, price: 64000.00, totalAmount: 6400.00 },
    { id: "2", date: "2026-05-12", type: "sell", symbol: "TSLA", quantity: 5.00, price: 180.20, totalAmount: 901.00 },
    { id: "3", date: "2026-05-10", type: "buy", symbol: "AAPL", quantity: 10.00, price: 175.50, totalAmount: 1755.00 }
  ]);

  // Form Inputs
  const [formSymbol, setFormSymbol] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

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

    // Create Transaction
    const newTx: Transaction = {
      id: Date.now().toString(),
      date: formDate,
      type: transactionType,
      symbol: symbolUpper,
      quantity: qtyNum,
      price: priceNum,
      totalAmount: totalAmt
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update Positions
    setPositions(prevPositions => {
      const existingIdx = prevPositions.findIndex(p => p.symbol.toUpperCase() === symbolUpper);
      const updated = [...prevPositions];

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
    });

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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Current Portfolio</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click on any asset to view performance details and transaction history.</p>
                </div>
              </div>

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
                    {positions.map((pos, idx) => (
                      <tr
                        key={pos.id}
                        onClick={() => setSelectedPosition(pos)}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          idx === positions.length - 1 ? "border-b-0" : ""
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
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Transaction History</h2>
              </div>

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
                        <td className="px-4 py-4 text-right">${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                          ${tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Asset Details: {selectedPosition.name}
                </h3>
                <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded mt-1">
                  {selectedPosition.symbol}
                </span>
              </div>
              <button
                onClick={() => setSelectedPosition(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedPosition.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Current Price</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedPosition.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Total Value</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedPosition.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Profit / Loss</span>
                  <span className={`text-lg font-bold ${selectedPosition.pl >= 0 ? "text-brand-500" : "text-red-500"}`}>
                    {selectedPosition.pl >= 0 ? "+" : ""}${selectedPosition.pl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Specific to Asset */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Transaction History for {selectedPosition.symbol}
                </h4>
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
                            <td className="px-4 py-3 text-right">${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              ${tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price per share</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="$0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                  />
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
    </>
  );
}
