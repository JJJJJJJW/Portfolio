import FinanceMetrics from "../../components/finance/FinanceMetrics";
import PortfolioChart from "../../components/finance/PortfolioChart";
import GoalProgressCard from "../../components/finance/GoalProgressCard";
import PageMeta from "../../components/common/PageMeta";

export default function Finance() {
  return (
    <>
      <PageMeta
        title="Finance & Goal Dashboard"
        description="Personal portfolio and goals management dashboard."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Top Metrics */}
        <div className="col-span-12">
          <FinanceMetrics />
        </div>

        {/* Left Side: Portfolio Chart */}
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <PortfolioChart />
        </div>

        {/* Right Side: Goals Progress */}
        <div className="col-span-12 xl:col-span-5">
          <GoalProgressCard />
        </div>
      </div>
    </>
  );
}
