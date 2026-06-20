import React, { useState, useEffect, useRef } from "react";
import type { GuestPosition } from "../../data/guestData";

interface AssetMaster {
  ticker: string;
  name: string;
  exchange: string;
  assetType: string;
}

interface AutocompleteSearchProps {
  positions: GuestPosition[];
  onAddPosition: (symbol: string, price: number) => void;
  usdToMyrRate: number;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

const isKlse = (symbol: string) => {
  const s = symbol.trim().toUpperCase();
  return s.endsWith(".KL") || s.endsWith(".XKLS") || s.endsWith(".KLSE");
};

export default function AutocompleteSearch({
  positions,
  onAddPosition
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetMaster[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  
  // Selected asset details
  const [selectedAsset, setSelectedAsset] = useState<AssetMaster | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const skipSearchRef = useRef(false);

  // Reset active suggestion index when results change
  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [results]);

  // Debounced search logic
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setSearchLoading(true);
    setError("");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/market/search?query=${encodeURIComponent(trimmedQuery)}`
        );
        if (!response.ok) {
          throw new Error("Failed to search assets");
        }
        const data = await response.json();
        setResults(data);
        setIsDropdownOpen(true);
      } catch (err: any) {
        console.error("Search request error:", err);
        setError("Failed to query local assets.");
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400); // 400ms debounce

    // Clear timeout on unmount or query change to prevent memory leaks
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Click outside to close dropdown listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Cancel any pending debounced search when clicking outside
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          setSearchLoading(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAsset = async (asset: AssetMaster) => {
    setIsDropdownOpen(false);
    skipSearchRef.current = true; // Skip triggering the search useEffect
    setQuery(asset.ticker);
    setSelectedAsset(asset);
    setLivePrice(null);
    setPriceLoading(true);
    setError("");

    // Clear any pending timeouts to prevent concurrent search calls
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      setSearchLoading(false);
    }

    try {
      const response = await fetch(
        `${API_URL}/api/v1/market/price?ticker=${encodeURIComponent(asset.ticker)}`
      );
      if (!response.ok) {
        throw new Error("Failed to retrieve live price");
      }
      const price = await response.json();
      if (price === 0.0) {
        throw new Error("Unable to fetch live price or symbol is inactive.");
      }
      setLivePrice(price);
    } catch (err: any) {
      console.error("Price retrieval error:", err);
      setError(err.message || "Failed to load live asset price.");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If dropdown is open and we have results, select the active one
      if (isDropdownOpen && results.length > 0) {
        handleSelectAsset(results[activeSuggestionIndex]);
      } else {
        // If dropdown is closed or empty, cancel any pending search
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          setSearchLoading(false);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (isDropdownOpen && results.length > 0) {
        setActiveSuggestionIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isDropdownOpen && results.length > 0) {
        setActiveSuggestionIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        setSearchLoading(false);
      }
    }
  };

  const handleFocus = () => {
    if (results.length > 0 && query.trim().length >= 2) {
      setIsDropdownOpen(true);
    }
  };

  // Find if user already holds the selected asset
  const matchedPos = selectedAsset
    ? positions.find((p) => p.symbol.toUpperCase() === selectedAsset.ticker.toUpperCase())
    : null;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Ticker Search
      </h3>

      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <input
            type="text"
            placeholder="Type ticker or asset name (e.g. AAPL, Maybank, BTC)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-medium"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg custom-scrollbar">
            {results.map((asset, index) => (
              <button
                key={asset.ticker}
                type="button"
                onClick={() => handleSelectAsset(asset)}
                className={`w-full px-4 py-2.5 text-left flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 last:border-b-0 transition-colors ${
                  index === activeSuggestionIndex
                    ? "bg-slate-100 dark:bg-gray-800"
                    : "hover:bg-slate-50 dark:hover:bg-gray-900/60"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {asset.ticker}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {asset.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded">
                    {asset.exchange}
                  </span>
                  <span className="inline-block bg-brand-500/10 text-brand-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {asset.assetType}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {isDropdownOpen && results.length === 0 && query.trim().length >= 2 && !searchLoading && (
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-lg text-center text-sm text-gray-500 dark:text-gray-400">
            No matching assets found in local master.
          </div>
        )}
      </div>

      {/* Selected Asset Details / Price Result */}
      {priceLoading && (
        <div className="mt-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Fetching live price...</span>
        </div>
      )}

      {selectedAsset && livePrice !== null && !priceLoading && (
        <div className="mt-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {selectedAsset.ticker}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  ({selectedAsset.name})
                </span>
                {matchedPos ? (
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
                {isKlse(selectedAsset.ticker) ? "RM " : "$"}
                {livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onAddPosition(selectedAsset.ticker, livePrice)}
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
          {matchedPos && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Your Holding</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {matchedPos.quantity.toFixed(4).replace(/\.?0+$/, "")} shares
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Avg Cost</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {isKlse(selectedAsset.ticker) ? "RM " : "$"}
                  {matchedPos.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Market Value</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {isKlse(selectedAsset.ticker) ? "RM " : "$"}
                  {(matchedPos.quantity * livePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block font-semibold">Total P/L</span>
                <span
                  className={`text-sm font-bold ${
                    (livePrice - matchedPos.avgPrice) * matchedPos.quantity >= 0 ? "text-brand-500" : "text-red-500"
                  }`}
                >
                  {(livePrice - matchedPos.avgPrice) * matchedPos.quantity >= 0 ? "+" : ""}
                  {isKlse(selectedAsset.ticker) ? "RM " : "$"}
                  {((livePrice - matchedPos.avgPrice) * matchedPos.quantity).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && !priceLoading && (
        <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-lg p-3 text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
