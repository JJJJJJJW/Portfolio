import React, { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";

export default function Positions() {
  const [activeTab, setActiveTab] = useState("positions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Current Portfolio</h2>
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
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">Apple Inc. (AAPL)</td>
                      <td className="px-4 py-4 text-right">50.00</td>
                      <td className="px-4 py-4 text-right">$150.00</td>
                      <td className="px-4 py-4 text-right">$175.50</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$8,775.00</td>
                      <td className="px-4 py-4 text-right text-brand-500 font-medium">+$1,275.00</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">Tesla (TSLA)</td>
                      <td className="px-4 py-4 text-right">20.00</td>
                      <td className="px-4 py-4 text-right">$200.00</td>
                      <td className="px-4 py-4 text-right">$180.20</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$3,604.00</td>
                      <td className="px-4 py-4 text-right text-red-500 font-medium">-$396.00</td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">Bitcoin (BTC)</td>
                      <td className="px-4 py-4 text-right">0.50</td>
                      <td className="px-4 py-4 text-right">$60,000.00</td>
                      <td className="px-4 py-4 text-right">$65,200.00</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$32,600.00</td>
                      <td className="px-4 py-4 text-right text-brand-500 font-medium">+$2,600.00</td>
                    </tr>
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
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4">2026-05-15</td>
                      <td className="px-4 py-4"><span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-500 ring-1 ring-inset ring-brand-500/20">Buy</span></td>
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">BTC</td>
                      <td className="px-4 py-4 text-right">0.10</td>
                      <td className="px-4 py-4 text-right">$64,000.00</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$6,400.00</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4">2026-05-12</td>
                      <td className="px-4 py-4"><span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Sell</span></td>
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">TSLA</td>
                      <td className="px-4 py-4 text-right">5.00</td>
                      <td className="px-4 py-4 text-right">$180.20</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$901.00</td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4">2026-05-10</td>
                      <td className="px-4 py-4"><span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-500 ring-1 ring-inset ring-brand-500/20">Buy</span></td>
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">AAPL</td>
                      <td className="px-4 py-4 text-right">10.00</td>
                      <td className="px-4 py-4 text-right">$175.50</td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">$1,755.00</td>
                    </tr>
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

            <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
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
                <input type="text" placeholder="e.g. AAPL" required className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input type="number" min="0" step="any" required placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" />
                </div>
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price per share</label>
                  <input type="number" min="0" step="any" required placeholder="$0.00" className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input type="date" required className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" />
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
