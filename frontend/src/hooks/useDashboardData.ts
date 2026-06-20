import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import {
  GUEST_FINANCE_METRICS,
  GUEST_CHART_DATA,
  GUEST_ASSET_CLASS_DATA,
  type GuestFinanceMetrics,
  type GuestChartData,
  type GuestAssetClassData,
} from "../data/guestData";

interface UseDashboardDataReturn {
  metrics: GuestFinanceMetrics;
  chartData: GuestChartData;
  assetClassData: GuestAssetClassData;
  isGuest: boolean;
  loading: boolean;
  baseCurrency: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * Hook that provides dashboard summary data (metrics, chart, asset class).
 * - Guest: returns demo data
 * - Authenticated: fetches actual metrics from backend Summary API
 */
export function useDashboardData(): UseDashboardDataReturn {
  const { isAuthenticated, session } = useUser();
  const isGuest = !isAuthenticated;

  const [metrics, setMetrics] = useState<GuestFinanceMetrics>(GUEST_FINANCE_METRICS);
  const [chartData, setChartData] = useState<GuestChartData>(GUEST_CHART_DATA);
  const [assetClassData, setAssetClassData] = useState<GuestAssetClassData>(GUEST_ASSET_CLASS_DATA);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  const fetchDashboardSummary = useCallback(async () => {
    if (isGuest) {
      setMetrics(GUEST_FINANCE_METRICS);
      setChartData(GUEST_CHART_DATA);
      setAssetClassData(GUEST_ASSET_CLASS_DATA);
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
          return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val);
        };

        const formatCurrencyWithSign = (val: number) => {
          const formatted = formatCurrency(Math.abs(val));
          return val >= 0 ? `+${formatted}` : `-${formatted}`;
        };

        const formatPercent = (val: number) => {
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

  return { metrics, chartData, assetClassData, isGuest, loading, baseCurrency };
}
