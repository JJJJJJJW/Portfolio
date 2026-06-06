import React, { useEffect, useState, useCallback } from "react";
import { Activity, Wifi, WifiOff, Database } from "lucide-react";

type ConnectionStatus = "checking" | "connected" | "disconnected";
type DatabaseStatus = "UP" | "DOWN" | "UNKNOWN";

interface HealthResponse {
  status: string;
  timestamp: string;
  message: string;
  database?: {
    status: string;
    database?: string;
    validConnection?: boolean;
    error?: string;
  };
}

export const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>("UNKNOWN");
  const [dbName, setDbName] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const checkHealth = useCallback(async () => {
    const startTime = performance.now();
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/v1/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
        setStatus("connected");

        const data: HealthResponse = await response.json();
        if (data.database) {
          setDbStatus(data.database.status === "UP" ? "UP" : "DOWN");
          setDbName(data.database.database || null);
        }
      } else {
        setStatus("disconnected");
        setLatency(null);
        setDbStatus("UNKNOWN");
        setDbName(null);
      }
    } catch {
      setStatus("disconnected");
      setLatency(null);
      setDbStatus("UNKNOWN");
      setDbName(null);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const getDbStatusColor = () => {
    if (dbStatus === "UP") return "text-emerald-500";
    if (dbStatus === "DOWN") return "text-rose-500";
    return "text-gray-400";
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={checkHealth}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300 border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/80"
        aria-label="Backend status"
      >
        <span className="relative flex h-2 w-2">
          {status === "checking" && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </>
          )}
          {status === "connected" && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </>
          )}
          {status === "disconnected" && (
            <>
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            </>
          )}
        </span>

        {/* Text Label */}
        <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">
          {status === "checking" && "Connecting..."}
          {status === "connected" && "API Online"}
          {status === "disconnected" && "API Offline"}
        </span>

        {/* Icon for mobile view */}
        <span className="sm:hidden text-gray-500 dark:text-gray-400">
          {status === "checking" && (
            <Activity className="h-3.5 w-3.5 animate-pulse" />
          )}
          {status === "connected" && (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          )}
          {status === "disconnected" && (
            <WifiOff className="h-3.5 w-3.5 text-rose-500" />
          )}
        </span>
      </button>

      {/* Glassmorphic Tooltip with DB status */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl shadow-lg border text-xs z-50 transition-all duration-200 bg-white/95 border-gray-200 text-gray-700 backdrop-blur-md dark:bg-gray-900/95 dark:border-gray-800 dark:text-gray-300">
          {/* Header */}
          <div className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
            <span>Server Status</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                status === "connected"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : status === "disconnected"
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {status}
            </span>
          </div>

          {/* API Details */}
          <div className="space-y-1.5 text-gray-500 dark:text-gray-400">
            <div className="flex justify-between items-center">
              <span>API Endpoint:</span>
              <span className="font-mono text-[10px]">/api/v1/health</span>
            </div>
            {status === "connected" && latency !== null && (
              <div className="flex justify-between items-center">
                <span>Latency:</span>
                <span className="font-mono text-emerald-500 font-semibold">
                  {latency}ms
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          {status === "connected" && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

              {/* Database Section */}
              <div className="space-y-1.5 text-gray-500 dark:text-gray-400">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Database:
                  </span>
                  <span
                    className={`font-semibold text-[10px] uppercase ${getDbStatusColor()}`}
                  >
                    {dbStatus}
                  </span>
                </div>
                {dbName && (
                  <div className="flex justify-between items-center">
                    <span>Catalog:</span>
                    <span className="font-mono text-[10px]">{dbName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Provider:</span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    Supabase
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-1.5 text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Click badge to refresh • Auto-checks every 30s
          </div>
        </div>
      )}
    </div>
  );
};
