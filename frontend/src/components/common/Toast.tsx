import React, { useEffect, useRef } from "react";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "success", onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (import.meta.env.DEV) console.log("[Toast] component mounted with message:", message);
    const timer = setTimeout(() => {
      if (import.meta.env.DEV) console.log("[Toast] auto-dismiss timer fired");
      onCloseRef.current();
    }, 3500);
    return () => {
      if (import.meta.env.DEV) console.log("[Toast] component unmounted/cleaned up");
      clearTimeout(timer);
    };
  }, [message]);

  const typeStyles = {
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
      icon: (
        <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    error: {
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400",
      icon: (
        <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bg: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
      icon: (
        <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const style = typeStyles[type] || typeStyles.success;

  return (
    <div className="fixed bottom-5 right-5 z-[999999] animate-toast-in">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-toast-in {
          animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl shadow-xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 ${style.bg}`}>
        {style.icon}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
