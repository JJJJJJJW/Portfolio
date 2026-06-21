import type { GuestCurrencyData } from "../../data/guestData";

interface CurrencyDistributionProps {
  currencyData: GuestCurrencyData;
}

const colors = [
  "bg-blue-600",
  "bg-teal-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

export default function CurrencyDistribution({ currencyData }: CurrencyDistributionProps) {
  // Filter out zero percentage values
  const activeCurrencies = currencyData.labels
    .map((label, idx) => ({
      label,
      pct: currencyData.series[idx] || 0,
      color: colors[idx % colors.length],
    }))
    .filter(item => item.pct > 0 && item.label !== "No Assets Yet");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-6 dark:border-gray-800 dark:bg-gray-900/[0.9] sm:px-6 sm:pt-6 flex flex-col w-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Currency
        </h3>
      </div>

      {/* Horizontal Segmented Progress Bar */}
      <div className="w-full h-3 flex rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-6">
        {activeCurrencies.map((item) => (
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

      {/* List Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        <span>Currency</span>
        <span>Ratio</span>
      </div>

      {/* Currency Rows */}
      <div className="space-y-3.5">
        {activeCurrencies.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-xs ${item.color}`} />
              <span className="text-gray-700 dark:text-gray-300 font-semibold">{item.label}</span>
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{item.pct.toFixed(2)}%</span>
          </div>
        ))}
        {activeCurrencies.length === 0 && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
            No assets yet
          </div>
        )}
      </div>
    </div>
  );
}
