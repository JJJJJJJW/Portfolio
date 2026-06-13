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
}

export const GUEST_POSITIONS: GuestPosition[] = [
  { id: "1", name: "Apple Inc.", symbol: "AAPL", quantity: 50.0, avgPrice: 150.0, currentPrice: 175.5, totalValue: 8775.0, pl: 1275.0 },
  { id: "2", name: "Tesla", symbol: "TSLA", quantity: 20.0, avgPrice: 200.0, currentPrice: 180.2, totalValue: 3604.0, pl: -396.0 },
  { id: "3", name: "Bitcoin", symbol: "BTC", quantity: 0.5, avgPrice: 60000.0, currentPrice: 65200.0, totalValue: 32600.0, pl: 2600.0 },
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
}

export const GUEST_TRANSACTIONS: GuestTransaction[] = [
  { id: "1", date: "2026-05-15", type: "buy", symbol: "BTC", quantity: 0.1, price: 64000.0, totalAmount: 6400.0 },
  { id: "2", date: "2026-05-12", type: "sell", symbol: "TSLA", quantity: 5.0, price: 180.2, totalAmount: 901.0 },
  { id: "3", date: "2026-05-10", type: "buy", symbol: "AAPL", quantity: 10.0, price: 175.5, totalAmount: 1755.0 },
];

// =========================================================================
// Goals
// =========================================================================

import type { FinancialGoal } from "../pages/Goals/types";

export const GUEST_GOALS: FinancialGoal[] = [
  {
    id: "g1",
    name: "Emergency Fund (6 Months)",
    category: "Emergency Fund",
    targetAmount: 15000,
    currentAmount: 12000,
    targetDate: "2026-10-01",
    createdDate: "2026-01-01",
    contributions: [
      { id: "c1", amount: 5000, date: "2026-01-10", note: "Initial Transfer" },
      { id: "c2", amount: 4000, date: "2026-03-05", note: "Bonus savings" },
      { id: "c3", amount: 3000, date: "2026-05-20", note: "Monthly contribution" },
    ],
  },
  {
    id: "g2",
    name: "Retirement Fund Core",
    category: "Retirement",
    targetAmount: 250000,
    currentAmount: 85000,
    targetDate: "2045-12-31",
    createdDate: "2024-01-01",
    contributions: [
      { id: "c4", amount: 80000, date: "2025-12-31", note: "Rollover amount" },
      { id: "c5", amount: 5000, date: "2026-04-15", note: "Yearly deposit" },
    ],
  },
  {
    id: "g3",
    name: "Holiday Trip to Japan",
    category: "Travel",
    targetAmount: 6000,
    currentAmount: 4800,
    targetDate: "2026-07-15",
    createdDate: "2026-01-15",
    contributions: [
      { id: "c6", amount: 2000, date: "2026-02-01", note: "Flight booking fund" },
      { id: "c7", amount: 2800, date: "2026-05-10", note: "Hotel and food pocket money" },
    ],
  },
  {
    id: "g4",
    name: "Crypto Portfolio Base",
    category: "Investment",
    targetAmount: 10000,
    currentAmount: 10000,
    targetDate: "2026-05-01",
    createdDate: "2025-05-01",
    contributions: [
      { id: "c8", amount: 5000, date: "2025-08-01", note: "Buying BTC" },
      { id: "c9", amount: 5000, date: "2026-04-20", note: "Buying ETH" },
    ],
  },
  {
    id: "g5",
    name: "Credit Card Debt Clearance",
    category: "Debt Payoff",
    targetAmount: 4000,
    currentAmount: 1200,
    targetDate: "2026-06-30",
    createdDate: "2026-01-01",
    contributions: [
      { id: "c10", amount: 1200, date: "2026-02-15", note: "Tax return payout" },
    ],
  },
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
