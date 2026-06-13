import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { GUEST_GOALS } from "../data/guestData";
import type { FinancialGoal, Contribution, GoalCategory } from "../pages/Goals/types";

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UseGoalsDataReturn {
  goals: FinancialGoal[];
  setGoals: React.Dispatch<React.SetStateAction<FinancialGoal[]>>;
  addGoal: (goal: FinancialGoal) => void;
  deleteGoal: (goalId: string) => void;
  addContribution: (goalId: string, contribution: Contribution) => void;
  isGuest: boolean;
  loading: boolean;
}

/**
 * Hook that provides financial goals data.
 * - Guest: returns demo data with local-only mutations
 * - Authenticated: fetches from backend API
 */
export function useGoalsData(): UseGoalsDataReturn {
  const { isAuthenticated, session } = useUser();
  const isGuest = !isAuthenticated;

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest) {
      setGoals(JSON.parse(JSON.stringify(GUEST_GOALS)));
      setLoading(false);
      return;
    }

    // Authenticated: fetch from backend
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/goals`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setGoals(
            data.map((g: Record<string, unknown>) => ({
              id: String(g.id),
              name: g.name as string,
              category: g.category as GoalCategory,
              targetAmount: Number(g.targetAmount),
              currentAmount: Number(g.currentAmount),
              targetDate: g.targetDate as string,
              createdDate: g.createdDate as string,
              contributions: Array.isArray(g.contributions)
                ? g.contributions.map((c: Record<string, unknown>) => ({
                    id: String(c.id),
                    amount: Number(c.amount),
                    date: c.date as string,
                    note: (c.note as string) || undefined,
                  }))
                : [],
            }))
          );
        } else {
          setGoals([]);
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [isGuest, session?.access_token]);

  const addGoal = useCallback(
    (goal: FinancialGoal) => {
      if (isGuest) {
        setGoals((prev) => [goal, ...prev]);
        return;
      }

      // Authenticated: POST to backend
      const postGoal = async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/goals`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              name: goal.name,
              category: goal.category,
              targetAmount: goal.targetAmount,
              targetDate: goal.targetDate,
            }),
          });

          if (res.ok) {
            const created = await res.json();
            const mapped: FinancialGoal = {
              id: String(created.id),
              name: created.name,
              category: created.category as GoalCategory,
              targetAmount: Number(created.targetAmount),
              currentAmount: Number(created.currentAmount),
              targetDate: created.targetDate,
              createdDate: created.createdDate,
              contributions: [],
            };
            setGoals((prev) => [mapped, ...prev]);
          } else {
            // Fallback: optimistic
            setGoals((prev) => [goal, ...prev]);
          }
        } catch {
          setGoals((prev) => [goal, ...prev]);
        }
      };

      postGoal();
    },
    [isGuest, session?.access_token]
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      if (isGuest) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        return;
      }

      // Authenticated: DELETE from backend
      const removeGoal = async () => {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        try {
          await fetch(`${API_URL}/api/v1/goals/${goalId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
        } catch (err) {
          console.error("Failed to delete goal:", err);
        }
      };

      removeGoal();
    },
    [isGuest, session?.access_token]
  );

  const addContribution = useCallback(
    (goalId: string, contribution: Contribution) => {
      if (isGuest) {
        setGoals((prev) =>
          prev.map((g) => {
            if (g.id === goalId) {
              return {
                ...g,
                currentAmount: g.currentAmount + contribution.amount,
                contributions: [...g.contributions, contribution],
              };
            }
            return g;
          })
        );
        return;
      }

      // Authenticated: POST contribution to backend
      const postContribution = async () => {
        // Optimistic update
        setGoals((prev) =>
          prev.map((g) => {
            if (g.id === goalId) {
              return {
                ...g,
                currentAmount: g.currentAmount + contribution.amount,
                contributions: [...g.contributions, contribution],
              };
            }
            return g;
          })
        );

        try {
          const res = await fetch(`${API_URL}/api/v1/goals/${goalId}/contributions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              amount: contribution.amount,
              date: contribution.date,
              note: contribution.note || null,
            }),
          });

          if (res.ok) {
            const updated = await res.json();
            setGoals((prev) =>
              prev.map((g) => {
                if (g.id === goalId) {
                  return {
                    ...g,
                    currentAmount: Number(updated.currentAmount),
                    contributions: Array.isArray(updated.contributions)
                      ? updated.contributions.map((c: Record<string, unknown>) => ({
                          id: String(c.id),
                          amount: Number(c.amount),
                          date: c.date as string,
                          note: (c.note as string) || undefined,
                        }))
                      : g.contributions,
                  };
                }
                return g;
              })
            );
          }
        } catch (err) {
          console.error("Failed to add contribution:", err);
        }
      };

      postContribution();
    },
    [isGuest, session?.access_token]
  );

  return { goals, setGoals, addGoal, deleteGoal, addContribution, isGuest, loading };
}
