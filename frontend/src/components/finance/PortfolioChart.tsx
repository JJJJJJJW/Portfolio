import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import type { GuestChartData } from "../../data/guestData";

interface PortfolioChartProps {
  chartData: GuestChartData;
  currency?: string;
}

export default function PortfolioChart({ chartData, currency }: PortfolioChartProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "monthly">("monthly");

  const prefix = currency === "MYR" ? "RM " : "$";

  const options: ApexOptions = {
    colors: ["#10b981"], // Emerald-500
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 300,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: timeframe === "monthly" ? chartData.monthlyCategories : chartData.dailyCategories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
      labels: {
        formatter: (value) => {
          if (Math.abs(value) >= 1000) {
            return `${prefix}${(value / 1000).toFixed(0)}k`;
          }
          return `${prefix}${value.toFixed(0)}`;
        },
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
  };

  const series = [
    {
      name: "Portfolio Value",
      data: timeframe === "monthly"
        ? chartData.monthlySeries
        : chartData.dailySeries,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-gray-900/[0.9] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Portfolio Value Over Time
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTimeframe("daily")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeframe === "daily" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe("monthly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeframe === "monthly" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="-ml-5 pl-2">
          <Chart options={options} series={series} type="area" height={300} />
        </div>
      </div>
    </div>
  );
}
