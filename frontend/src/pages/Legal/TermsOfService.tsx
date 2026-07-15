import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function TermsOfService() {
  return (
    <>
      <PageMeta
        title="Terms of Service | Ace TechFolio"
        description="Terms of Service for Ace TechFolio application."
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
              Terms of Service
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              Last Updated: July 15, 2026
            </p>

            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing or using <strong>ACE TechFolio</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the application.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  2. Description of Service
                </h2>
                <p>
                  ACE TechFolio is a personal portfolio and goals tracking dashboard web application. It allows users to enter stock and asset transactions, track investment subtotals, create budget planners, and request AI analysis through Google Gemini.
                </p>
                <p className="mt-2 text-brand-danger dark:text-red-400 font-semibold">
                  Disclaimer: ACE TechFolio is for informational and educational tracking purposes only. We do not provide professional financial advice, investment recommendations, or asset trading services.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  3. Accounts & Security
                </h2>
                <p className="mb-3">
                  When accessing our dashboard services, you must check the following:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>You may register manually or authenticate securely using Google OAuth.</li>
                  <li>You are responsible for keeping your login credentials confidential.</li>
                  <li>You agree to immediately notify the developer of any unauthorized access to your account.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  4. Prohibited Uses
                </h2>
                <p className="mb-3">
                  You agree not to use the application to:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>Violate any local, national, or international laws or regulations.</li>
                  <li>Perform reverse engineering, service scanning, or automated scrapers that degrade application performance.</li>
                  <li>Submit false, misleading, or malicious portfolio transaction records.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  5. Intellectual Property
                </h2>
                <p>
                  All software code, visual assets, styles, branding, and layouts of ACE TechFolio are owned exclusively by us or our licensing partners and are protected by international copyright and intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  6. Limitation of Liability
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, ACE TechFolio and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use of, or inability to use, our dashboard, portfolio trackers, or AI-generated stock analysis recommendations.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-3 font-outfit">
                  7. Modifications to Terms
                </h2>
                <p>
                  We reserve the right to revise or update these Terms of Service at any time. Your continued use of the application following the posting of changes constitutes acceptance of those changes.
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
