import React, { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { FinancialGoal, GoalCategory, GoalStatus, Contribution } from "./types";
import {
  DollarLineIcon,
  TrashBinIcon,
  CalenderIcon,
  AngleRightIcon
} from "../../icons";

export default function Goals() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  // Form states for creating a goal
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<GoalCategory>("Savings");
  const [formTargetAmount, setFormTargetAmount] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");

  // Form states for logged contribution
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(new Date().toISOString().split("T")[0]);
  const [contribNote, setContribNote] = useState("");

  // Staggered loading trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Default Mock Data
    const initialGoals: FinancialGoal[] = [
      {
        id: "g1",
        name: "Emergency Fund (6 Months)",
        category: "Emergency Fund",
        targetAmount: 15000,
        currentAmount: 12000,
        targetDate: "2026-10-01",
        createdDate: "2026-01-01",
        contributions: [
          { id: "c1", amount: 5000, date: "2026-01-10", note: "Initial Transfer" },
          { id: "c2", amount: 4000, date: "2026-03-05", note: "Bonus savings" },
          { id: "c3", amount: 3000, date: "2026-05-20", note: "Monthly contribution" }
        ]
      },
      {
        id: "g2",
        name: "Retirement Fund Core",
        category: "Retirement",
        targetAmount: 250000,
        currentAmount: 85000,
        targetDate: "2045-12-31",
        createdDate: "2024-01-01",
        contributions: [
          { id: "c4", amount: 80000, date: "2025-12-31", note: "Rollover amount" },
          { id: "c5", amount: 5000, date: "2026-04-15", note: "Yearly deposit" }
        ]
      },
      {
        id: "g3",
        name: "Holiday Trip to Japan",
        category: "Travel",
        targetAmount: 6000,
        currentAmount: 4800,
        targetDate: "2026-07-15",
        createdDate: "2026-01-15",
        contributions: [
          { id: "c6", amount: 2000, date: "2026-02-01", note: "Flight booking fund" },
          { id: "c7", amount: 2800, date: "2026-05-10", note: "Hotel and food pocket money" }
        ]
      },
      {
        id: "g4",
        name: "Crypto Portfolio Base",
        category: "Investment",
        targetAmount: 10000,
        currentAmount: 10000,
        targetDate: "2026-05-01",
        createdDate: "2025-05-01",
        contributions: [
          { id: "c8", amount: 5000, date: "2025-08-01", note: "Buying BTC" },
          { id: "c9", amount: 5000, date: "2026-04-20", note: "Buying ETH" }
        ]
      },
      {
        id: "g5",
        name: "Credit Card Debt Clearance",
        category: "Debt Payoff",
        targetAmount: 4000,
        currentAmount: 1200,
        targetDate: "2026-06-30", // Coming soon, progress < 75% -> At Risk
        createdDate: "2026-01-01",
        contributions: [
          { id: "c10", amount: 1200, date: "2026-02-15", note: "Tax return payout" }
        ]
      }
    ];

    setGoals(initialGoals);

    return () => observer.disconnect();
  }, []);

  // Compute status dynamically
  const computeGoalStatus = (goal: FinancialGoal): GoalStatus => {
    if (goal.currentAmount >= goal.targetAmount) {
      return "Completed";
    }

    const today = new Date();
    const target = new Date(goal.targetDate);
    const created = new Date(goal.createdDate);

    if (today > target) {
      return "Overdue";
    }

    // Days difference logic
    const msDiff = target.getTime() - today.getTime();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;

    // Linear pacing check
    const totalDuration = target.getTime() - created.getTime();
    const elapsedDuration = today.getTime() - created.getTime();
    const expectedProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;

    // Condition for At Risk:
    // 1. Less than 30 days remaining but progress is less than 75%
    // 2. Expected progress is more than 20% ahead of current progress
    if (
      (daysRemaining < 30 && progressPercent < 75) ||
      (expectedProgress - progressPercent > 20)
    ) {
      return "At Risk";
    }

    return "On Track";
  };

  const getStatusBadgeAndColor = (status: GoalStatus) => {
    switch (status) {
      case "Completed":
        return { badgeColor: "success" as const, fillClass: "bg-success-500", textClass: "text-success-600 dark:text-success-500" };
      case "At Risk":
        return { badgeColor: "warning" as const, fillClass: "bg-warning-500", textClass: "text-warning-600 dark:text-orange-400" };
      case "Overdue":
        return { badgeColor: "error" as const, fillClass: "bg-error-500", textClass: "text-error-600 dark:text-error-500" };
      default:
        return { badgeColor: "primary" as const, fillClass: "bg-brand-500", textClass: "text-brand-500 dark:text-brand-400" };
    }
  };

  // Add Contribution logic
  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(contribAmount);
    if (!selectedGoal || isNaN(amountVal) || amountVal <= 0) return;

    const newContribution: Contribution = {
      id: Date.now().toString(),
      amount: amountVal,
      date: contribDate,
      note: contribNote.trim() || undefined
    };

    const updatedGoals = goals.map((g) => {
      if (g.id === selectedGoal.id) {
        const updatedContributions = [...g.contributions, newContribution];
        const newCurrent = g.currentAmount + amountVal;
        return {
          ...g,
          currentAmount: newCurrent,
          contributions: updatedContributions
        };
      }
      return g;
    });

    setGoals(updatedGoals);

    // Update selected goal details if it's currently open
    const refetchedSelected = updatedGoals.find(g => g.id === selectedGoal.id) || null;
    setSelectedGoal(refetchedSelected);

    // Reset Form
    setIsContributionModalOpen(false);
    setContribAmount("");
    setContribNote("");
    setContribDate(new Date().toISOString().split("T")[0]);
  };

  // Create Goal logic
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmtVal = parseFloat(formTargetAmount);
    if (!formName.trim() || isNaN(targetAmtVal) || targetAmtVal <= 0 || !formTargetDate) return;

    const newGoal: FinancialGoal = {
      id: Date.now().toString(),
      name: formName.trim(),
      category: formCategory,
      targetAmount: targetAmtVal,
      currentAmount: 0,
      targetDate: formTargetDate,
      createdDate: new Date().toISOString().split("T")[0],
      contributions: []
    };

    setGoals([newGoal, ...goals]);

    // Reset Form
    setIsCreateModalOpen(false);
    setFormName("");
    setFormCategory("Savings");
    setFormTargetAmount("");
    setFormTargetDate("");
  };

  // Delete Goal logic
  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm("Are you sure you want to delete this goal? All contribution history will be lost.")) {
      setGoals(goals.filter((g) => g.id !== goalId));
      setIsDetailModalOpen(false);
      setSelectedGoal(null);
    }
  };

  // Calculations for metrics card
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const completedGoalsCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <>
      <PageMeta
        title="Goals - Finance & Goal Dashboard"
        description="Plan and monitor your long-term personal financial goals."
      />

      <div ref={containerRef} className="space-y-6 relative h-full">
        {/* Title Header */}
        <div className={`transition-all duration-1000 delay-100 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goal Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Plan, monitor, and achieve your financial aspirations.
              </p>
            </div>
          </div>
        </div>

        {/* Global Mini-Metrics Panel */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 transition-all duration-1000 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8]">
            <span className="text-sm text-gray-500 dark:text-gray-400 block">Total Savings Stashed</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              ${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8]">
            <span className="text-sm text-gray-500 dark:text-gray-400 block">Total Goal Target</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 font-outfit">
              ${totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8]">
            <span className="text-sm text-gray-500 dark:text-gray-400 block">Completed Goals</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {completedGoalsCount} <span className="text-sm font-medium text-gray-400">/ {goals.length}</span>
            </h4>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8]">
            <span className="text-sm text-gray-500 dark:text-gray-400 block">Overall Target Completion</span>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-3 rounded-full bg-brand-500 transition-all duration-1000"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>
              <span className="font-bold text-gray-800 dark:text-white/90 text-sm">{overallProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Goals Cards View */}
        <div className={`transition-all duration-1000 delay-300 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900/[0.8] rounded-2xl border border-gray-200 dark:border-gray-800 min-h-[300px]">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/95 mt-4">No goals configured</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Get started by creating your first financial goal.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {goals.map((goal) => {
                const status = computeGoalStatus(goal);
                const { badgeColor, fillClass } = getStatusBadgeAndColor(status);
                const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

                const dateObj = new Date(goal.targetDate);
                const formattedDate = dateObj.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                });

                return (
                  <div
                    key={goal.id}
                    className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/[0.8] shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    {/* Header: Icon & Dynamic Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{goal.name}</h3>
                          <span className="text-xs text-gray-400 font-medium">{goal.category}</span>
                        </div>
                      </div>
                      <Badge color={badgeColor} variant="light">
                        {status}
                      </Badge>
                    </div>

                    {/* Progress details */}
                    <div className="mt-6 flex-1 flex flex-col justify-end">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Saved</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${goal.currentAmount.toLocaleString()} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/ ${goal.targetAmount.toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Progress bar container */}
                      <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-3 text-xs">
                        <span className="text-gray-400 dark:text-gray-500">{percent.toFixed(0)}% Saved</span>
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <CalenderIcon className="w-4 h-4 text-gray-400" />
                          <span>By {formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800/80 mt-5 pt-4">
                      <button
                        onClick={() => {
                          setSelectedGoal(goal);
                          setIsContributionModalOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                      >
                        <DollarLineIcon className="w-4 h-4" />
                        Log Contribution
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGoal(goal);
                          setIsDetailModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60 transition-colors border border-gray-200 dark:border-gray-800"
                      >
                        Details
                        <AngleRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Goal Floating Button */}
        <div className={`fixed bottom-10 right-10 z-50 transition-all duration-1000 delay-500 ease-out ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-30 blur-xs"}`}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex h-14 items-center rounded-full bg-brand-500 p-4 text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:pr-6 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-xs group-hover:ml-2 font-medium text-white">
              Create Goal
            </span>
          </button>
        </div>
      </div>

      {/* Goal Detail Modal */}
      {isDetailModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  {selectedGoal.name}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Category: {selectedGoal.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteGoal(selectedGoal.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete Goal"
                >
                  <TrashBinIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedGoal(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Mini Stats Summary inside details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Target Amount</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedGoal.targetAmount.toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Saved So Far</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedGoal.currentAmount.toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Created Date</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-1 block">{selectedGoal.createdDate}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Target Date</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-1 block">{selectedGoal.targetDate}</span>
                </div>
              </div>

              {/* Transaction list */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Contribution Logs</h4>
                <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-xl">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Note / Description</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selectedGoal.contributions.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">{c.date}</td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-300 font-medium">{c.note || "Manual Contribution"}</td>
                            <td className="px-4 py-3 text-right font-bold text-brand-500">+${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {selectedGoal.contributions.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-600 font-medium">
                              No contributions logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsContributionModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-500/20 text-sm"
              >
                <DollarLineIcon className="w-5 h-5" />
                Add Contribution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Contribution Modal */}
      {isContributionModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Log Contribution</h3>
              <button
                onClick={() => {
                  setIsContributionModalOpen(false);
                  setSelectedGoal(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="p-5 space-y-4" onSubmit={handleAddContribution}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedGoal.name}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contribution Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="0.00"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly transfer, Extra income"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-brand-500/30"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Goal</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="p-5 space-y-4" onSubmit={handleCreateGoal}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. New Car Savings"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as GoalCategory)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                >
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Investment">Investment</option>
                  <option value="Debt Payoff">Debt Payoff</option>
                  <option value="Savings">Savings</option>
                  <option value="Education">Education</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="0.00"
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-brand-500/30"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
