import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";

export default function AssetClass() {
  const { theme } = useTheme();

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      background: "transparent",
      toolbar: {
        show: false,
      },
    },
    theme: {
      mode: theme === "dark" ? "dark" : "light",
    },
    labels: ["Equities", "Bonds", "Real Estate", "Cash", "Crypto"],
    colors: ["#00a16cff", "#3b82f6", "#f59e0b", "#6366f1", "#8b5cf6"], // Emerald, Blue, Amber, Indigo, Violet
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit, sans-serif",
      formatter: function(seriesName, opts) {
        return seriesName + " - " + opts.w.globals.series[opts.seriesIndex] + "%"
      },
      labels: {
        colors: theme === "dark" ? "#ffffff" : undefined,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    dataLabels: {
      enabled: false,
      style: {
        fontFamily: "Outfit, sans-serif",
        fontWeight: 500,
        colors: theme === "dark" ? ["#ffffff"] : undefined,
      },
      dropShadow: {
        enabled: false,
      },
    },
    stroke: {
      width: 0,
    },
    tooltip: {
      theme: theme === "dark" ? "dark" : "light",
      y: {
        formatter: (val) => `${val}%`,
      },
    },
  };

  const series = [45, 20, 15, 10, 10];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-gray-900/[0.9] sm:px-6 sm:pt-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          Asset Classification
        </h3>
      </div>

      <div className="cursor-pointer flex-1 w-full flex flex-col justify-center [&_.apexcharts-legend-text]:dark:!text-white [&_.apexcharts-legend-text]:dark:!fill-white [&_.apexcharts-pie-label]:dark:!fill-white [&_.apexcharts-datalabel]:dark:!fill-white">
        <Chart options={options} series={series} type="pie" height={310} width="100%" />
      </div>
    </div>
  );
}
