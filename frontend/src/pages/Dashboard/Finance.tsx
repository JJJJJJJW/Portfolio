import { useEffect, useRef, useState } from "react";
import FinanceMetrics from "../../components/finance/FinanceMetrics";
import PortfolioChart from "../../components/finance/PortfolioChart";
import AssetClass from "../../components/finance/AssetClass";
import PageMeta from "../../components/common/PageMeta";

export default function Finance() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Reset animation when scrolled out of view
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
      <PageMeta
        title="Finance & Goal Dashboard"
        description="Personal portfolio and goals management dashboard."
      />
      <div ref={containerRef} className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Top Metrics: Zooms in and unblurs */}
        <div className={`col-span-12 transition-all duration-1000 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <FinanceMetrics />
        </div>

        {/* Left Side: Portfolio Chart: Slides in from left with a slight tilt */}
        <div className={`col-span-12 space-y-6 xl:col-span-7 transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <PortfolioChart />
        </div>

        {/* Right Side: Goals Progress: Slides in from right with a zoom */}
        <div className={`col-span-12 xl:col-span-5 transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          <AssetClass />
        </div>
      </div>
    </>
  );
}
