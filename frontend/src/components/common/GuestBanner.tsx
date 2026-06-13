import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useUser } from "../../context/UserContext";

/**
 * A slim, dismissible banner shown below the header when not authenticated.
 * Informs visitors they're viewing demo data and encourages sign-in.
 */
export default function GuestBanner() {
  const { isAuthenticated } = useUser();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (isAuthenticated || dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-2.5 mb-4">
      {/* Pulse dot */}
      <span className="flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-brand-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
      </span>

      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
        You're viewing{" "}
        <span className="text-brand-500 font-semibold">demo data</span>.{" "}
        <Link
          to="/signin"
          state={{ from: location }}
          className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 underline underline-offset-2 font-semibold transition-colors"
        >
          Sign in
        </Link>{" "}
        to track your own portfolio.
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Dismiss banner"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
