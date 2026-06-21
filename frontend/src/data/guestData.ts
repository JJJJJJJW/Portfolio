/**
 * Centralized guest/demo data for unauthenticated visitors.
 * This is the single source of truth for all placeholder data
 * shown when no user is logged in.
 */

// =========================================================================
// Positions / Assets
// =========================================================================

export interface GuestPosition {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  pl: number;
  isCustom: boolean;
  category?: string;
  currency: "USD" | "MYR";
}

export const GUEST_POSITIONS: GuestPosition[] = [
  { id: "1", name: "Apple Inc.", symbol: "AAPL", quantity: 50.0, avgPrice: 150.0, currentPrice: 175.5, totalValue: 8775.0, pl: 1275.0, isCustom: false, category: "STOCK", currency: "USD" },
  { id: "2", name: "Tesla", symbol: "TSLA", quantity: 20.0, avgPrice: 200.0, currentPrice: 180.2, totalValue: 3604.0, pl: -396.0, isCustom: false, category: "STOCK", currency: "USD" },
  { id: "3", name: "Bitcoin", symbol: "BTC", quantity: 0.5, avgPrice: 60000.0, currentPrice: 65200.0, totalValue: 32600.0, pl: 2600.0, isCustom: false, category: "CRYPTO", currency: "USD" },
  { id: "4", name: "My Luxury Watch", symbol: "WATCH", quantity: 1.0, avgPrice: 5000.0, currentPrice: 5000.0, totalValue: 5000.0, pl: 0.0, isCustom: true, category: "OTHER", currency: "MYR" },
];

// =========================================================================
// Transactions
// =========================================================================

export interface GuestTransaction {
  id: string;
  date: string;
  type: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  totalAmount: number;
  currency: "USD" | "MYR";
  category?: string;
  isCustom?: boolean;
  currentPrice?: number;
  customExchangeRate?: number;
}

export const GUEST_TRANSACTIONS: GuestTransaction[] = [
  { id: "1", date: "2026-05-15", type: "buy", symbol: "BTC", quantity: 0.1, price: 64000.0, totalAmount: 6400.0, currency: "USD", category: "CRYPTO" },
  { id: "2", date: "2026-05-12", type: "sell", symbol: "TSLA", quantity: 5.0, price: 180.2, totalAmount: 901.0, currency: "USD", category: "STOCK" },
  { id: "3", date: "2026-05-10", type: "buy", symbol: "AAPL", quantity: 10.0, price: 175.5, totalAmount: 1755.0, currency: "USD", category: "STOCK" },
];

// =========================================================================
// Dashboard Finance Metrics
// =========================================================================

export interface GuestFinanceMetrics {
  portfolioValue: string;
  portfolioChange: string;
  investmentReturns: string;
  returnsChange: string;
  annualisedReturn: string;
  annualisedChange: string;
  realisedPL: string;
}

export const GUEST_FINANCE_METRICS: GuestFinanceMetrics = {
  portfolioValue: "$124,500.00",
  portfolioChange: "11.01%",
  investmentReturns: "+$8,400.00",
  returnsChange: "15.00%",
  annualisedReturn: "12%",
  annualisedChange: "4.05%",
  realisedPL: "+$5,000.00",
};

// =========================================================================
// Portfolio Chart Data
// =========================================================================

export interface GuestChartData {
  monthlyCategories: string[];
  dailyCategories: string[];
  monthlySeries: number[];
  dailySeries: number[];
}

export const GUEST_CHART_DATA: GuestChartData = {
  monthlyCategories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dailyCategories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  monthlySeries: [95, 102, 105, 101, 108, 115, 112, 118, 120, 119, 122, 124.5],
  dailySeries: [122, 121.5, 123, 122.8, 124, 124.2, 124.5],
};

// =========================================================================
// Asset Class (Pie Chart) Data
// =========================================================================

export interface GuestAssetClassData {
  labels: string[];
  series: number[];
}

export const GUEST_ASSET_CLASS_DATA: GuestAssetClassData = {
  labels: ["Equities", "Bonds", "Real Estate", "Cash", "Crypto"],
  series: [45, 20, 15, 10, 10],
};

// =========================================================================
// Currency Exposure (Pie Chart) Data
// =========================================================================

export interface GuestCurrencyData {
  labels: string[];
  series: number[];
}

export const GUEST_CURRENCY_DATA: GuestCurrencyData = {
  labels: ["USD", "MYR", "SGD", "EUR"],
  series: [65.0, 25.0, 7.0, 3.0],
};
