import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <PageMeta
        title="404 - Page Not Found | Investment Dashboard"
        description="The page you are looking for does not exist."
      />
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-3xl p-8 shadow-theme-md">
        <h1 className="text-title-md font-bold text-gray-900 dark:text-white mt-6">404</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Page Not Found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="mt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-brand-500/25"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
