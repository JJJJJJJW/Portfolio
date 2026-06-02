export type GoalCategory =
  | "Emergency Fund"
  | "Retirement"
  | "Investment"
  | "Debt Payoff"
  | "Savings"
  | "Education"
  | "Travel"
  | "Other";

export type GoalStatus = "On Track" | "At Risk" | "Completed" | "Overdue";

export interface Contribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;      // ISO format YYYY-MM-DD
  createdDate: string;     // ISO format YYYY-MM-DD
  contributions: Contribution[];
}
