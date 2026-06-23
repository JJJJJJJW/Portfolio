import React, { useState, useEffect, useRef, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";
import { useUser } from "../context/UserContext";

// --- Types ---
interface PLEntry {
  pl: number;
  pct: number;
  realizedPL?: number;
  unrealizedPL?: number;
  createdAt?: string;
}

// --- Mock Data Generator ---
function generateDailyPL(year: number, month: number): Record<string, PLEntry> {
  const data: Record<string, PLEntry> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    // Don't generate data for future dates
    if (date > today) continue;

    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const pl = Math.round((Math.random() * 2000 - 800) * 100) / 100;
    // Random daily % between -2% and +3%
    const pct = Math.round((Math.random() * 5 - 2) * 100) / 100;
    data[key] = { pl, pct };
  }
  return data;
}

function generateYearlyPL(year: number): Record<string, PLEntry> {
  const data: Record<string, PLEntry> = {};
  const today = new Date();

  for (let m = 0; m < 12; m++) {
    if (year > today.getFullYear() || (year === today.getFullYear() && m > today.getMonth())) continue;

    const monthKey = `${year}-${String(m + 1).padStart(2, "0")}`;
    const pl = Math.round((Math.random() * 9000 - 3000) * 100) / 100;
    // Random monthly % between -8% and +15%
    const pct = Math.round((Math.random() * 23 - 8) * 100) / 100;
    data[monthKey] = { pl, pct };
  }
  return data;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLCalendar: React.FC = () => {
  const { isAuthenticated, user, session } = useUser();

  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: string; pl: number; pct: number; realizedPL?: number; unrealizedPL?: number; createdAt?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Daily Snapshots State & Fetching for Authenticated Users ---
  const [snapshots, setSnapshots] = useState<Record<string, PLEntry>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token) {
      setSnapshots({});
      return;
    }

    const fetchSnapshots = async () => {
      setSnapshotsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/dashboard/pl-calendar`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data: { date: string; pl: number; pct: number; realizedPL?: number; unrealizedPL?: number; createdAt?: string }[] = await res.json();
          const mapped: Record<string, PLEntry> = {};
          data.forEach(item => {
            const dateStr = item.date.substring(0, 10);
            mapped[dateStr] = {
              pl: item.pl,
              pct: item.pct,
              realizedPL: item.realizedPL,
              unrealizedPL: item.unrealizedPL,
              createdAt: item.createdAt,
            };
          });
          setSnapshots(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch daily snapshots:", err);
      } finally {
        setSnapshotsLoading(false);
      }
    };

    fetchSnapshots();
  }, [isAuthenticated, session?.access_token, API_URL]);

  // Listen for Escape key to close the day detail popup
  useEffect(() => {
    if (!selectedDay) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedDay(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDay]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
        else setIsVisible(false);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- Data Generation (memoized) ---
  const dailyPL = useMemo(() => {
    if (isAuthenticated) {
      return snapshots;
    }
    return generateDailyPL(currentYear, currentMonth);
  }, [isAuthenticated, snapshots, currentYear, currentMonth]);

  const yearlyPL = useMemo(() => {
    if (isAuthenticated) {
      const yearlyResults: Record<string, PLEntry> = {};
      const monthlyPL: Record<string, { pl: number; pctSum: number; count: number }> = {};

      const now = new Date();
      // Initialize only non-future months of the year
      for (let m = 0; m < 12; m++) {
        if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && m > now.getMonth())) {
          continue;
        }
        const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
        monthlyPL[monthKey] = { pl: 0, pctSum: 0, count: 0 };
      }

      // Aggregate daily results by month for currentYear
      for (const [dateStr, info] of Object.entries(snapshots)) {
        if (dateStr.startsWith(`${currentYear}-`)) {
          const monthKey = dateStr.substring(0, 7); // "YYYY-MM"
          if (monthlyPL[monthKey]) {
            monthlyPL[monthKey].pl += info.pl;
            monthlyPL[monthKey].pctSum += info.pct;
            monthlyPL[monthKey].count += 1;
          }
        }
      }

      for (const [monthKey, info] of Object.entries(monthlyPL)) {
        yearlyResults[monthKey] = {
          pl: Math.round(info.pl * 100) / 100,
          pct: Math.round(info.pctSum * 100) / 100,
        };
      }

      return yearlyResults;
    }
    return generateYearlyPL(currentYear);
  }, [isAuthenticated, snapshots, currentYear]);

  // --- Summary Stats ---
  const monthTotal = useMemo(() => {
    return Object.values(dailyPL).reduce((sum, v) => sum + v.pl, 0);
  }, [dailyPL]);

  const monthTotalPct = useMemo(() => {
    return Object.values(dailyPL).reduce((sum, v) => sum + v.pct, 0);
  }, [dailyPL]);

  const yearTotal = useMemo(() => {
    return Object.values(yearlyPL).reduce((sum, v) => sum + v.pl, 0);
  }, [yearlyPL]);

  const yearTotalPct = useMemo(() => {
    return Object.values(yearlyPL).reduce((sum, v) => sum + v.pct, 0);
  }, [yearlyPL]);

  const bestDay = useMemo(() => {
    const entries = Object.entries(dailyPL);
    if (entries.length === 0) return null;
    return entries.reduce((best, curr) => (curr[1].pl > best[1].pl ? curr : best));
  }, [dailyPL]);

  const worstDay = useMemo(() => {
    const entries = Object.entries(dailyPL);
    if (entries.length === 0) return null;
    return entries.reduce((worst, curr) => (curr[1].pl < worst[1].pl ? curr : worst));
  }, [dailyPL]);

  // --- Calendar Grid Helpers ---
  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    // getDay() returns 0 for Sun, we want Mon=0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; dateKey: string }[] = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        day: d,
        isCurrentMonth: false,
        dateKey: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        isCurrentMonth: true,
        dateKey: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Next month padding (fill to complete rows only)
    const totalNeeded = Math.ceil(days.length / 7) * 7;
    const remaining = totalNeeded - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        day: d,
        isCurrentMonth: false,
        dateKey: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return days;
  };

  // --- Navigation ---
  const goNext = () => {
    if (viewMode === "month") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(y => y + 1);
      } else {
        setCurrentMonth(m => m + 1);
      }
    } else {
      setCurrentYear(y => y + 1);
    }
  };

  const goBack = () => {
    if (viewMode === "month") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(y => y - 1);
      } else {
        setCurrentMonth(m => m - 1);
      }
    } else {
      setCurrentYear(y => y - 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // --- Formatting ---
  const currencySymbol = useMemo(() => {
    if (isAuthenticated && user?.currency === "MYR") return "RM";
    return "$";
  }, [isAuthenticated, user?.currency]);

  const formatPL = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000) return `${value >= 0 ? "+" : "-"}${currencySymbol}${(abs / 1000).toFixed(1)}k`;
    return `${value >= 0 ? "+" : "-"}${currencySymbol}${abs.toFixed(0)}`;
  };

  const formatPLFull = (value: number) => {
    return `${value >= 0 ? "+" : ""}${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPct = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const formatPctShort = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const formatTimestamp = (ts: string) => {
    try {
      // 1. Remove milliseconds/microseconds if present
      const cleanTs = ts.split(".")[0];
      
      // 2. Parse date in UTC
      let normalized = cleanTs.replace(" ", "T");
      const timePart = normalized.split("T")[1] || "";
      if (!normalized.endsWith("Z") && !timePart.includes("+") && !timePart.includes("-")) {
        normalized = normalized + "Z";
      }
      const date = new Date(normalized);
      
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
      
      // Fallback: strip seconds from "YYYY-MM-DD HH:mm:ss"
      const match = cleanTs.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
      return cleanTs;
    } catch {
      return ts;
    }
  };

  const getIntensityClass = (pl: number) => {
    const abs = Math.abs(pl);
    if (abs < 0.01) {
      return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
    }
    if (pl > 0) {
      if (abs > 800) return "bg-brand-500/25 text-brand-400";
      if (abs > 400) return "bg-brand-500/15 text-brand-400";
      return "bg-brand-500/8 text-brand-500/80";
    } else {
      if (abs > 800) return "bg-red-500/25 text-red-400";
      if (abs > 400) return "bg-red-500/15 text-red-400";
      return "bg-red-500/8 text-red-500/80";
    }
  };

  const getMonthIntensity = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 0.01) {
      return "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/[0.8]";
    }
    if (value > 0) {
      if (abs > 4000) return "bg-brand-500/25 border-brand-500/30";
      if (abs > 2000) return "bg-brand-500/15 border-brand-500/20";
      return "bg-brand-500/8 border-brand-500/10";
    } else {
      if (abs > 4000) return "bg-red-500/25 border-red-500/30";
      if (abs > 2000) return "bg-red-500/15 border-red-500/20";
      return "bg-red-500/8 border-red-500/10";
    }
  };

  const isToday = (dateKey: string) => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return dateKey === todayKey;
  };

  const calendarDays = getCalendarDays();

  return (
    <>
      <PageMeta title="P/L Calendar" description="Track your daily and monthly profit and loss performance." />

      <div ref={containerRef} className="space-y-6 relative h-full">
        {/* Header */}
        <div className={`transition-all duration-1000 delay-100 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">P/L Calendar</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Visualize your daily asset performance at a glance.</p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "month"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "year"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <div className="bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              {viewMode === "month" ? `${MONTHS[currentMonth]} P/L` : `${currentYear} P/L`}
            </span>
            <span className={`text-xl font-bold ${(viewMode === "month" ? monthTotal : yearTotal) >= 0 ? "text-brand-500" : "text-red-500"}`}>
              {formatPLFull(viewMode === "month" ? monthTotal : yearTotal)}
            </span>
            <span className={`text-m font-medium block ${(viewMode === "month" ? monthTotalPct : yearTotalPct) >= 0 ? "text-brand-500/70" : "text-red-500/70"}`}>
              {formatPct(viewMode === "month" ? monthTotalPct : yearTotalPct)}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Best Day</span>
            <span className="text-xl font-bold text-brand-500">
              {bestDay ? formatPLFull(bestDay[1].pl) : "—"}
            </span>
            {bestDay && (
              <span className="text-m font-medium text-brand-500/70 block">{formatPct(bestDay[1].pct)}</span>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Worst Day</span>
            <span className={`text-xl font-bold ${
              worstDay && worstDay[1].pl < 0 
                ? "text-red-500" 
                : (worstDay && worstDay[1].pl > 0 ? "text-brand-500" : "text-gray-400 dark:text-gray-500")
            }`}>
              {worstDay ? formatPLFull(worstDay[1].pl) : "—"}
            </span>
            {worstDay && (
              <span className={`text-m font-medium block ${
                worstDay[1].pl < 0 
                  ? "text-red-500/70" 
                  : (worstDay[1].pl > 0 ? "text-brand-500/70" : "text-gray-400/70 dark:text-gray-500/70")
              }`}>{formatPct(worstDay[1].pct)}</span>
            )}
          </div>
        </div>

        {/* Calendar Area */}
        <div className={`bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 
          shadow-sm max-w-8xl  transition-all duration-1000 delay-300 ease-out 
          ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          {snapshotsLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
              <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading performance history...</p>
            </div>
          ) : (
            <>
              {/* Navigation Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={goBack}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
                    {viewMode === "month" ? `${MONTHS[currentMonth]} ${currentYear}` : `${currentYear}`}
                  </h2>
                  <button
                    onClick={goNext}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                {viewMode === "month" && (
                  <button
                    onClick={goToday}
                    className="px-3 py-1.5 text-xs font-medium text-brand-500 border border-brand-500/30 bg-brand-500/5 rounded-lg hover:bg-brand-500/10 transition-colors"
                  >
                    Today
                  </button>
                )}
              </div>

              {/* MONTH VIEW */}
              {viewMode === "month" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-1.5">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, idx) => {
                      const entry = dailyPL[cell.dateKey];
                      const hasData = entry !== undefined;
                      const today = isToday(cell.dateKey);

                      return (
                        <button
                          key={idx}
                          onClick={() => hasData && cell.isCurrentMonth ? setSelectedDay({ date: cell.dateKey, pl: entry.pl, pct: entry.pct, realizedPL: entry.realizedPL, unrealizedPL: entry.unrealizedPL, createdAt: entry.createdAt }) : null}
                          className={`
                            relative py-4 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-center
                            ${!cell.isCurrentMonth ? "opacity-30" : ""}
                            ${hasData && cell.isCurrentMonth ? `${getIntensityClass(entry.pl)} hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 cursor-pointer` : ""}
                            ${!hasData && cell.isCurrentMonth ? "hover:bg-gray-50 dark:hover:bg-gray-800/40" : ""}
                            ${today ? "ring-2 ring-brand-500" : ""}
                          `}
                        >
                          <span className={`text-sm font-bold ${
                            today ? "text-brand-500" :
                            cell.isCurrentMonth ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"
                          }`}>
                            {cell.day}
                          </span>
                          {hasData && cell.isCurrentMonth && (
                            <>
                              <span className="text-[12px] font-bold leading-none">
                                {formatPL(entry.pl)}
                              </span>
                              <span className={`text-[12px] font-semibold leading-none ${
                                Math.abs(entry.pct) < 0.01 
                                  ? "text-gray-400/60 dark:text-gray-500/60" 
                                  : (entry.pct >= 0 ? "text-brand-500/60" : "text-red-500/60")
                              }`}>
                                {formatPctShort(entry.pct)}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-brand-500/20"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Profit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500/20"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Loss</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded ring-2 ring-brand-500"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
                    </div>
                  </div>
                </div>
              )}

              {/* YEAR VIEW */}
              {viewMode === "year" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MONTHS.map((_, monthIdx) => {
                      const key = `${currentYear}-${String(monthIdx + 1).padStart(2, "0")}`;
                      const entry = yearlyPL[key];
                      const hasData = entry !== undefined;
                      const isCurrentMonthNow = currentYear === new Date().getFullYear() && monthIdx === new Date().getMonth();

                      return (
                        <button
                          key={monthIdx}
                          onClick={() => {
                            if (hasData) {
                              setCurrentMonth(monthIdx);
                              setViewMode("month");
                            }
                          }}
                          className={`
                            rounded-2xl p-4 border transition-all text-left
                            ${hasData
                              ? `${getMonthIntensity(entry.pl)} hover:shadow-md cursor-pointer`
                              : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 opacity-50"
                            }
                            ${isCurrentMonthNow ? "ring-2 ring-brand-500" : ""}
                          `}
                        >
                          <span className={`text-sm font-semibold block mb-1 ${
                            isCurrentMonthNow ? "text-brand-500" : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {MONTH_SHORT[monthIdx]}
                          </span>
                          {hasData ? (
                            <>
                              <span className={`text-lg font-bold block ${
                                Math.abs(entry.pl) < 0.01 
                                  ? "text-gray-400 dark:text-gray-500" 
                                  : (entry.pl > 0 ? "text-brand-500" : "text-red-500")
                              }`}>
                                {formatPLFull(entry.pl)}
                              </span>
                              <span className={`text-xs font-medium ${
                                Math.abs(entry.pct) < 0.01 
                                  ? "text-gray-400/70 dark:text-gray-500/70" 
                                  : (entry.pct > 0 ? "text-brand-500/70" : "text-red-500/70")
                              }`}>
                                {formatPct(entry.pct)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Year Total Footer */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Year Total</span>
                    <span className={`text-lg font-bold ${yearTotal >= 0 ? "text-brand-500" : "text-red-500"}`}>
                      {formatPLFull(yearTotal)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Day Detail Popup */}
      {selectedDay && (
        <div 
          onClick={() => setSelectedDay(null)}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily P/L</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{selectedDay.date}</span>
                {selectedDay.createdAt && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    Last updated: {formatTimestamp(selectedDay.createdAt)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center py-4">
                <span className={`text-4xl font-bold ${
                  Math.abs(selectedDay.pl) < 0.01 
                    ? "text-gray-400 dark:text-gray-500" 
                    : (selectedDay.pl > 0 ? "text-brand-500" : "text-red-500")
                }`}>
                  {formatPLFull(selectedDay.pl)}
                </span>
                <span className={`text-lg font-semibold block mt-0.5 ${
                  Math.abs(selectedDay.pct) < 0.01 
                    ? "text-gray-400/70 dark:text-gray-500/70" 
                    : (selectedDay.pct > 0 ? "text-brand-500/70" : "text-red-500/70")
                }`}>
                  {formatPct(selectedDay.pct)}
                </span>
                <p className={`text-sm mt-1 ${
                  Math.abs(selectedDay.pl) < 0.01 
                    ? "text-gray-400/70 dark:text-gray-500/70" 
                    : (selectedDay.pl > 0 ? "text-brand-500/70" : "text-red-500/70")
                }`}>
                  {Math.abs(selectedDay.pl) < 0.01 
                    ? "Neutral Day •" 
                    : (selectedDay.pl > 0 ? "Profitable Day ✓" : "Loss Day ✗")}
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Breakdown</h4>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-800/60">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Realized P/L</span>
                  <span className={`text-sm font-bold ${(selectedDay.realizedPL !== undefined ? selectedDay.realizedPL : selectedDay.pl * 0.6) >= 0 ? "text-brand-500" : "text-red-500"}`}>
                    {formatPLFull(selectedDay.realizedPL !== undefined ? selectedDay.realizedPL : Math.round(selectedDay.pl * 0.6 * 100) / 100)}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-800/60">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Unrealized P/L</span>
                  <span className={`text-sm font-bold ${(selectedDay.unrealizedPL !== undefined ? selectedDay.unrealizedPL : selectedDay.pl * 0.4) >= 0 ? "text-brand-500" : "text-red-500"}`}>
                    {formatPLFull(selectedDay.unrealizedPL !== undefined ? selectedDay.unrealizedPL : Math.round(selectedDay.pl * 0.4 * 100) / 100)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PLCalendar;
