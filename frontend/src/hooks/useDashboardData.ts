import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import {
  GUEST_FINANCE_METRICS,
  GUEST_CHART_DATA,
  GUEST_ASSET_CLASS_DATA,
  GUEST_CURRENCY_DATA,
  type GuestChartData,
  type GuestAssetClassData,
  type GuestCurrencyData,
} from "../data/guestData";

export interface DashboardMetrics {
  portfolioValue: string;
  portfolioChange: string;
  investmentReturns: string;
  returnsChange: string;
  annualisedReturn: string;
  annualisedChange: string;
  realisedPL: string;
  topPerformerSymbol: string;
  topPerformerPct: string;
  topPerformerVal: string;
  worstPerformerSymbol: string;
  worstPerformerPct: string;
  worstPerformerVal: string;
  tradeWinRate: string;
  tradeWinRateDetails: string;
}

interface UseDashboardDataReturn {
  metrics: DashboardMetrics;
  chartData: GuestChartData;
  assetClassData: GuestAssetClassData;
  currencyData: GuestCurrencyData;
  isGuest: boolean;
  loading: boolean;
  baseCurrency: string;
}

const GUEST_DASHBOARD_METRICS: DashboardMetrics = {
  ...GUEST_FINANCE_METRICS,
  topPerformerSymbol: "BTC",
  topPerformerPct: "+4.33%",
  topPerformerVal: "+$2,600.00",
  worstPerformerSymbol: "TSLA",
  worstPerformerPct: "-9.90%",
  worstPerformerVal: "-$396.00",
  tradeWinRate: "66.67%",
  tradeWinRateDetails: "2 of 3 trades in profit",
};

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * Hook that provides dashboard summary data (metrics, chart, asset class).
 * - Guest: returns demo data
 * - Authenticated: fetches actual metrics from backend Summary API
 */
export function useDashboardData(): UseDashboardDataReturn {
  const { isAuthenticated, session } = useUser();
  const isGuest = !isAuthenticated;

  const [metrics, setMetrics] = useState<DashboardMetrics>(GUEST_DASHBOARD_METRICS);
  const [chartData, setChartData] = useState<GuestChartData>(GUEST_CHART_DATA);
  const [assetClassData, setAssetClassData] = useState<GuestAssetClassData>(GUEST_ASSET_CLASS_DATA);
  const [currencyData, setCurrencyData] = useState<GuestCurrencyData>(GUEST_CURRENCY_DATA);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  const fetchDashboardSummary = useCallback(async () => {
    if (isGuest) {
      setMetrics(GUEST_DASHBOARD_METRICS);
      setChartData(GUEST_CHART_DATA);
      setAssetClassData(GUEST_ASSET_CLASS_DATA);
      setCurrencyData(GUEST_CURRENCY_DATA);
      setBaseCurrency("USD");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const currency = data.baseCurrency || "USD";
        setBaseCurrency(currency);

        const formatCurrency = (val: number) => {
          const cleanVal = val === null || val === undefined || isNaN(val) ? 0 : val;
          return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(cleanVal);
        };

        const formatCurrencyWithSign = (val: number) => {
          const cleanVal = val === null || val === undefined || isNaN(val) ? 0 : val;
          const formatted = formatCurrency(Math.abs(cleanVal));
          return cleanVal >= 0 ? `+${formatted}` : `-${formatted}`;
        };

        const formatPercent = (val: number) => {
          if (val === null || val === undefined || isNaN(val)) {
            return "0.00%";
          }
          return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
        };

        setMetrics({
          portfolioValue: formatCurrency(data.portfolioValue || 0),
          portfolioChange: formatPercent(data.portfolioChange || 0),
          investmentReturns: formatCurrencyWithSign(data.investmentReturns || 0),
          returnsChange: formatPercent(data.returnsChange || 0),
          annualisedReturn: data.annualisedReturn || "0%",
          annualisedChange: formatPercent(data.annualisedChange || 0),
          realisedPL: formatCurrencyWithSign(data.realisedPL || 0),
          topPerformerSymbol: data.topPerformerSymbol || "N/A",
          topPerformerPct: data.topPerformerSymbol ? formatPercent(data.topPerformerPct || 0) : "0.00%",
          topPerformerVal: data.topPerformerSymbol ? formatCurrencyWithSign(data.topPerformerVal || 0) : formatCurrency(0),
          worstPerformerSymbol: data.worstPerformerSymbol || "N/A",
          worstPerformerPct: data.worstPerformerSymbol ? formatPercent(data.worstPerformerPct || 0) : "0.00%",
          worstPerformerVal: data.worstPerformerSymbol ? formatCurrencyWithSign(data.worstPerformerVal || 0) : formatCurrency(0),
          tradeWinRate: data.totalSells > 0 ? `${(data.tradeWinRate || 0).toFixed(2)}%` : "0.00%",
          tradeWinRateDetails: data.totalSells > 0
            ? `${data.profitableSells} of ${data.totalSells} trades in profit`
            : "No trades closed yet",
        });

        setChartData({
          monthlyCategories: data.monthlyCategories || [],
          dailyCategories: data.dailyCategories || [],
          monthlySeries: data.monthlySeries || [],
          dailySeries: data.dailySeries || [],
        });

        setAssetClassData({
          labels: data.assetClassLabels || ["No Assets Yet"],
          series: data.assetClassSeries || [100],
        });

        setCurrencyData({
          labels: data.currencyDistributionLabels || ["No Assets Yet"],
          series: data.currencyDistributionSeries || [100],
        });
      } else {
        console.error("Failed to fetch dashboard summary, status:", response.status);
      }
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  }, [isGuest, session?.access_token]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  return { metrics, chartData, assetClassData, currencyData, isGuest, loading, baseCurrency };
}
