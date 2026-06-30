import { useEffect, useRef, useState } from "react";
import FinanceMetrics from "../../components/finance/FinanceMetrics";
import PortfolioChart from "../../components/finance/PortfolioChart";
import AssetClass from "../../components/finance/AssetClass";
import PageMeta from "../../components/common/PageMeta";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function Finance() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { metrics, chartData, assetClassData, currencyData, loading, baseCurrency } = useDashboardData();

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return (
      <>
        <PageMeta
          title="Portfolio Overview | Investment Dashboard"
          description="View and track your financial portfolio, net worth, and historical performance."
        />
        <div className="flex flex-col items-center justify-center min-h-[450px] gap-4 w-full">
          <svg className="animate-spin h-10 w-10 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold tracking-wide animate-pulse">
            Loading dashboard data...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Portfolio Overview | Investment Dashboard"
        description="View and track your financial portfolio, net worth, and historical performance."
      />
      <div ref={containerRef} className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Top Metrics: Staggered animation handled inside */}
        <div className="col-span-12">
          <FinanceMetrics metrics={metrics} currencyData={currencyData} isVisible={isVisible} />
        </div>

        {/* Left Side: Portfolio Chart: Slides in with a subtle fade-up */}
        <div className={`col-span-12 space-y-6 xl:col-span-7 transition-all duration-1000 delay-400 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-10 blur-xs'}`}>
          <PortfolioChart chartData={chartData} currency={baseCurrency} />
        </div>

        {/* Right Side: Asset Classification: Slides in with a subtle fade-up */}
        <div className={`col-span-12 xl:col-span-5 transition-all duration-1000 delay-400 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-10 blur-xs'}`}>
          <AssetClass assetClassData={assetClassData} />
        </div>
      </div>
    </>
  );
}
