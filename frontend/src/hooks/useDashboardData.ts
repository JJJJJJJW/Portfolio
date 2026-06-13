import { useState, useEffect } from "react";
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
}

/**
 * Hook that provides dashboard summary data (metrics, chart, asset class).
 * - Guest: returns demo data
 * - Authenticated: uses same demo format for now (backend summary endpoint can be added later)
 */
export function useDashboardData(): UseDashboardDataReturn {
  const { isAuthenticated } = useUser();
  const isGuest = !isAuthenticated;

  const [metrics, setMetrics] = useState<GuestFinanceMetrics>(GUEST_FINANCE_METRICS);
  const [chartData, setChartData] = useState<GuestChartData>(GUEST_CHART_DATA);
  const [assetClassData, setAssetClassData] = useState<GuestAssetClassData>(GUEST_ASSET_CLASS_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest) {
      setMetrics(GUEST_FINANCE_METRICS);
      setChartData(GUEST_CHART_DATA);
      setAssetClassData(GUEST_ASSET_CLASS_DATA);
      setLoading(false);
      return;
    }

    // Authenticated: For now, show zeroed-out metrics for new users.
    // A dedicated /api/v1/dashboard/summary endpoint can be added later.
    setMetrics({
      portfolioValue: "$0.00",
      portfolioChange: "0.00%",
      investmentReturns: "$0.00",
      returnsChange: "0.00%",
      annualisedReturn: "0%",
      annualisedChange: "0.00%",
      realisedPL: "$0.00",
    });
    setChartData({
      monthlyCategories: GUEST_CHART_DATA.monthlyCategories,
      dailyCategories: GUEST_CHART_DATA.dailyCategories,
      monthlySeries: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      dailySeries: [0, 0, 0, 0, 0, 0, 0],
    });
    setAssetClassData({
      labels: ["No Assets Yet"],
      series: [100],
    });
    setLoading(false);
  }, [isGuest]);

  return { metrics, chartData, assetClassData, isGuest, loading };
}
