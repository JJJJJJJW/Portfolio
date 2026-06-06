import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function PortfolioChart() {
  const [timeframe, setTimeframe] = useState<"daily" | "monthly">("monthly");
  const options: ApexOptions = {
    colors: ["#10b981"], // Emerald-500
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 300,
      toolbar: {
        show: false,
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
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
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
        formatter: (value) => `$${value}k`,
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
        formatter: (val: number) => `$${val}k`,
      },
    },
  };

  const monthlyCategories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dailyCategories = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  options.xaxis = {
    ...options.xaxis,
    categories: timeframe === "monthly" ? monthlyCategories : dailyCategories,
  };

  const series = [
    {
      name: "Portfolio Value",
      data: timeframe === "monthly" 
        ? [95, 102, 105, 101, 108, 115, 112, 118, 120, 119, 122, 124.5]
        : [122, 121.5, 123, 122.8, 124, 124.2, 124.5],
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-gray-900/[0.9] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Portfolio Value Over Time (Since 17 May 2026)
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTimeframe("daily")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeframe === "daily" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe("monthly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeframe === "monthly" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="area" height={300} />
        </div>
      </div>
    </div>
  );
}
