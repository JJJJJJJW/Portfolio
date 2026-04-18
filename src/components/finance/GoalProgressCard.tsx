import React from "react";

export default function GoalProgressCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Financial Goals
        </h3>
        <button className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
          + Add Goal
        </button>
      </div>

      <div className="space-y-6">
        {/* Goal 1 */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">Emergency Fund</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">$8k / $10k</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-brand-500 h-2.5 rounded-full" style={{ width: "80%" }}></div>
          </div>
        </div>

        {/* Goal 2 */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">Vacation to Japan</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">$1.5k / $5k</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "30%" }}></div>
          </div>
        </div>

        {/* Goal 3 */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">New Laptop</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">$2k / $2.5k</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: "80%" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
