import {
  ArrowUpIcon,
  ArrowDownIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import type { DashboardMetrics } from "../../hooks/useDashboardData";
import type { GuestCurrencyData } from "../../data/guestData";

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

interface FinanceMetricsProps {
  metrics: DashboardMetrics;
  currencyData: GuestCurrencyData;
  isVisible: boolean;
}

const colors = [
  "bg-blue-600",
  "bg-teal-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

export default function FinanceMetrics({ metrics, currencyData, isVisible }: FinanceMetricsProps) {
  const winRateVal = parseFloat(metrics.tradeWinRate) || 0;

  const activeCurrencies = currencyData.labels
    .map((label: string, idx: number) => ({
      label,
      pct: currencyData.series[idx] || 0,
      color: colors[idx % colors.length],
    }))
    .filter((item: { label: string; pct: number; color: string }) => item.pct > 0 && item.label !== "No Assets Yet");

  return (
    <div className="space-y-4 md:space-y-6 text-gray-800 dark:text-white/90">
      {/* <!-- First Row of Cards --> */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 transition-all duration-1000 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-10 blur-xs'}`}>
        {/* <!-- Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <WalletIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Portfolio Value
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.portfolioValue}
              </h4>
            </div>
          </div>
        </div>
        {/* <!-- Metric Item End --> */}

        {/* <!-- Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <TrendingUpIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Investment Returns
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.investmentReturns}
              </h4>
            </div>

            <Badge color={parseFloat(metrics.returnsChange) >= 0 ? "success" : "error"}>
              {parseFloat(metrics.returnsChange) >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {metrics.returnsChange}
            </Badge>
          </div>
        </div>
        {/* <!-- Metric Item End --> */}

        {/* <!-- Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <ClockIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Time Weighted Return
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.annualisedReturn}
              </h4>
            </div>
          </div>
        </div>
        {/* <!-- Metric Item End --> */}
        
        {/* <!-- Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <DollarIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Realised P/L
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.realisedPL}
              </h4>
            </div>
          </div>
        </div>
        {/* <!-- Metric Item End --> */}
      </div>

      {/* <!-- Second Row of Cards: Performance Gainers/Losers, Win Rate & Currency Exposure --> */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 transition-all duration-1000 delay-250 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-10 blur-xs'}`}>
        {/* <!-- Win Rate Card --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6 flex flex-col justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Trade Win Rate
            </span>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.tradeWinRate}
              </h4>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-medium">
                {metrics.tradeWinRateDetails}
              </p>
            </div>
            <Badge color={winRateVal >= 50.0 ? "success" : "info"}>
              {metrics.tradeWinRate}
            </Badge>
          </div>
        </div>

        {/* <!-- Top Performer Card --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6 flex flex-col justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Top Performer
            </span>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.topPerformerSymbol}
              </h4>
              <p className={`mt-1 text-xs font-semibold ${metrics.topPerformerPct.startsWith("-") ? "text-red-500" : "text-emerald-500"}`}>
                {metrics.topPerformerSymbol !== "N/A" 
                  ? metrics.topPerformerVal
                  : "No active holdings"}
              </p>
            </div>
            {metrics.topPerformerSymbol !== "N/A" && (
              <Badge color={metrics.topPerformerPct.startsWith("-") ? "error" : "success"}>
                {metrics.topPerformerPct.startsWith("-") ? <ArrowDownIcon /> : <ArrowUpIcon />}
                {metrics.topPerformerPct}
              </Badge>
            )}
          </div>
        </div>

        {/* <!-- Worst Performer Card --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6 flex flex-col justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Worst Performer
            </span>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.worstPerformerSymbol}
              </h4>
              <p className={`mt-1 text-xs font-semibold ${metrics.worstPerformerPct.startsWith("-") ? "text-red-500" : "text-emerald-500"}`}>
                {metrics.worstPerformerSymbol !== "N/A" 
                  ? metrics.worstPerformerVal
                  : "No active holdings"}
            </p>
            </div>
            {metrics.worstPerformerSymbol !== "N/A" && (
              <Badge color={metrics.worstPerformerPct.startsWith("-") ? "error" : "success"}>
                {metrics.worstPerformerPct.startsWith("-") ? <ArrowDownIcon /> : <ArrowUpIcon />}
                {metrics.worstPerformerPct}
              </Badge>
            )}
          </div>
        </div>

        {/* <!-- Currency Exposure Card --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] md:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Currency Exposure
            </span>
          </div>
          <div className="mt-4">
            {/* Horizontal segmented progress bar */}
            <div className="w-full h-2.5 flex rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
              {activeCurrencies.map((item: { label: string; pct: number; color: string }) => (
                <div
                  key={item.label}
                  style={{ width: `${item.pct}%` }}
                  className={`h-full ${item.color} transition-all duration-500`}
                  title={`${item.label}: ${item.pct.toFixed(2)}%`}
                />
              ))}
              {activeCurrencies.length === 0 && (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700" title="No assets recorded" />
              )}
            </div>
            {/* Segment text row */}
            <p className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
              {activeCurrencies.map((item: { label: string; pct: number; color: string }, idx: number) => (
                <span key={item.label}>
                  {idx > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>}
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.color} mr-1`} />
                  {item.label}: {item.pct.toFixed(1)}%
                </span>
              ))}
              {activeCurrencies.length === 0 && "No active holdings"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
