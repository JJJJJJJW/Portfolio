import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function PrivacyPolicy() {
  return (
    <>
      <PageMeta
        title="Privacy Policy | Ace TechFolio"
        description="Privacy Policy for Ace TechFolio application."
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6 mb-8">
            <div className="flex items-center gap-3">
              <span className="font-outfit text-2xl font-extrabold text-gray-900 dark:text-white">
                ACE <span className="text-brand-500">TechFolio</span>
              </span>
            </div>
            <Link
              to="/"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Card Wrapper */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-10 shadow-sm leading-relaxed">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 font-outfit">
              Privacy Policy
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              Last Updated: July 15, 2026
            </p>

            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  1. Introduction
                </h2>
                <p>
                  Welcome to <strong>ACE TechFolio</strong> ("we", "us", or "our"). We respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy describes how we collect, use, and process your information when you use our web application.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  2. Information We Collect
                </h2>
                <p className="mb-3">
                  We collect information to provide a better experience and analyze your investment portfolio performance. This information includes:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>
                    <strong>Account Details:</strong> When you register or sign in via Google OAuth, we collect your email address, display name, and avatar image URL.
                  </li>
                  <li>
                    <strong>Portfolio Data:</strong> Any investment transactions, cost basis, quantities, asset categories (stocks, crypto, ETFs, mutual funds), and custom assets you enter manually into the application.
                  </li>
                  <li>
                    <strong>System Preferences:</strong> Your preferred base display currency (USD/MYR) and risk appetite level.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  3. How We Use Your Information
                </h2>
                <p className="mb-3">
                  We process and use your information solely for the following purposes:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>To verify your identity and manage your user account session via secure JWT tokens.</li>
                  <li>To calculate portfolio subtotals, profit/loss tracking, and goal planning calculations.</li>
                  <li>To provide personalized, AI-driven stock and asset analysis suggestions through the integration of the Google Gemini API.</li>
                  <li>To maintain and improve the security, performance, and features of the application.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  4. Data Security and Retention
                </h2>
                <p className="mb-3">
                  We prioritize your data security:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>We implement Row Level Security (RLS) within our Supabase database to isolate user data.</li>
                  <li>We authenticate API requests using stateless JWT tokens, ensuring credentials are never exposed.</li>
                  <li>We retain your data only for as long as your account remains active. You can request deletion of your account and all associated portfolio data at any time.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  5. Google API Services & Third Parties
                </h2>
                <p>
                  Our authentication utilizes Google OAuth Sign-In. We adhere to the Google API Services User Data Policy, including the Limited Use requirements. Your Google user data is not shared with any external third parties, advertising partners, or utilized for marketing purposes.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  6. Changes to this Policy
                </h2>
                <p>
                  We may modify this Privacy Policy from time to time. Any changes will be updated on this page with an updated "Last Updated" date. We encourage you to review this policy periodically.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  7. Contact Us
                </h2>
                <p>
                  If you have any questions or feedback regarding this Privacy Policy, please contact us via our developer channel.
                </p>
              </section>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="text-center text-xs text-gray-500 mt-8">
            &copy; {new Date().getFullYear()} ACE TechFolio. All rights reserved.
          </div>
        </div>
      </div>

      {/* Theme Toggler */}
      <div className="fixed z-50 bottom-6 right-6">
        <ThemeTogglerTwo />
      </div>
    </>
  );
}
