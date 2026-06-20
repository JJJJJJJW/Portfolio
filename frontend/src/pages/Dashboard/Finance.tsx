import { useEffect, useRef, useState } from "react";
import FinanceMetrics from "../../components/finance/FinanceMetrics";
import PortfolioChart from "../../components/finance/PortfolioChart";
import AssetClass from "../../components/finance/AssetClass";
import PageMeta from "../../components/common/PageMeta";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function Finance() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { metrics, chartData, assetClassData, loading, baseCurrency } = useDashboardData();

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
          title="Finance & Goal Dashboard"
          description="Personal portfolio and goals management dashboard."
        />
        <div className="grid grid-cols-12 gap-4 md:gap-6 animate-pulse">
          {/* Metrics Skeleton */}
          <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] h-[130px]">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="mt-5 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
          {/* Chart Skeleton */}
          <div className="col-span-12 xl:col-span-7 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/[0.9] h-[370px]">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-4" />
            <div className="h-[280px] bg-gray-100 dark:bg-gray-800/50 rounded" />
          </div>
          {/* Pie Skeleton */}
          <div className="col-span-12 xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/[0.9] h-[370px] flex flex-col justify-between">
            <div>
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-full w-[200px] h-[200px]" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Finance & Goal Dashboard"
        description="Personal portfolio and goals management dashboard."
      />
      <div ref={containerRef} className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Top Metrics: Zooms in and unblurs */}
        <div className={`col-span-12 transition-all duration-1000 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <FinanceMetrics metrics={metrics} />
        </div>

        {/* Left Side: Portfolio Chart: Slides in from left with a slight tilt */}
        <div className={`col-span-12 space-y-6 xl:col-span-7 transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <PortfolioChart chartData={chartData} currency={baseCurrency} />
        </div>

        {/* Right Side: Goals Progress: Slides in from right with a zoom */}
        <div className={`col-span-12 xl:col-span-5 transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <AssetClass assetClassData={assetClassData} />
        </div>
      </div>
    </>
  );
}
