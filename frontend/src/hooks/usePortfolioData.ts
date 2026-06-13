import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import {
  GUEST_POSITIONS,
  GUEST_TRANSACTIONS,
  type GuestPosition,
  type GuestTransaction,
} from "../data/guestData";

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UsePortfolioDataReturn {
  positions: GuestPosition[];
  transactions: GuestTransaction[];
  setPositions: React.Dispatch<React.SetStateAction<GuestPosition[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<GuestTransaction[]>>;
  addTransaction: (tx: GuestTransaction, updatedPositions: GuestPosition[]) => void;
  isGuest: boolean;
  loading: boolean;
}

/**
 * Hook that provides portfolio positions and transaction data.
 * - Guest: returns demo data with local-only mutations
 * - Authenticated: fetches from backend API
 */
export function usePortfolioData(): UsePortfolioDataReturn {
  const { isAuthenticated, session } = useUser();
  const isGuest = !isAuthenticated;

  const [positions, setPositions] = useState<GuestPosition[]>([]);
  const [transactions, setTransactions] = useState<GuestTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest) {
      // Deep clone guest data so mutations don't affect the constants
      setPositions(JSON.parse(JSON.stringify(GUEST_POSITIONS)));
      setTransactions(JSON.parse(JSON.stringify(GUEST_TRANSACTIONS)));
      setLoading(false);
      return;
    }

    // Authenticated: fetch from backend
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${session?.access_token}`,
        };

        const [assetsRes, txRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/assets`, { headers }),
          fetch(`${API_URL}/api/v1/transactions`, { headers }),
        ]);

        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setPositions(
            assetsData.map((a: Record<string, unknown>) => ({
              id: a.id as string,
              name: a.name as string,
              symbol: a.symbol as string,
              quantity: Number(a.quantity),
              avgPrice: Number(a.avgPrice),
              currentPrice: Number(a.currentPrice),
              totalValue: Number(a.totalValue),
              pl: Number(a.pl),
            }))
          );
        } else {
          setPositions([]);
        }

        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(
            txData.map((t: Record<string, unknown>) => ({
              id: t.id as string,
              date: t.date as string,
              type: t.type as "buy" | "sell",
              symbol: t.symbol as string,
              quantity: Number(t.quantity),
              price: Number(t.price),
              totalAmount: Number(t.totalAmount),
            }))
          );
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error("Failed to fetch portfolio data:", err);
        setPositions([]);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isGuest, session?.access_token]);

  const addTransaction = useCallback(
    (tx: GuestTransaction, updatedPositions: GuestPosition[]) => {
      if (isGuest) {
        // Guest: local-only mutation
        setTransactions((prev) => [tx, ...prev]);
        setPositions(updatedPositions);
        return;
      }

      // Authenticated: POST to backend, then update local state
      const postTx = async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/transactions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              type: tx.type,
              symbol: tx.symbol,
              quantity: tx.quantity,
              price: tx.price,
              date: tx.date,
            }),
          });

          if (res.ok) {
            // Refetch to get server state
            const [assetsRes, txRes] = await Promise.all([
              fetch(`${API_URL}/api/v1/assets`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
              }),
              fetch(`${API_URL}/api/v1/transactions`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
              }),
            ]);

            if (assetsRes.ok) {
              const assetsData = await assetsRes.json();
              setPositions(
                assetsData.map((a: Record<string, unknown>) => ({
                  id: a.id as string,
                  name: a.name as string,
                  symbol: a.symbol as string,
                  quantity: Number(a.quantity),
                  avgPrice: Number(a.avgPrice),
                  currentPrice: Number(a.currentPrice),
                  totalValue: Number(a.totalValue),
                  pl: Number(a.pl),
                }))
              );
            }

            if (txRes.ok) {
              const txData = await txRes.json();
              setTransactions(
                txData.map((t: Record<string, unknown>) => ({
                  id: t.id as string,
                  date: t.date as string,
                  type: t.type as "buy" | "sell",
                  symbol: t.symbol as string,
                  quantity: Number(t.quantity),
                  price: Number(t.price),
                  totalAmount: Number(t.totalAmount),
                }))
              );
            }
          } else {
            // Fallback: optimistic local update
            setTransactions((prev) => [tx, ...prev]);
            setPositions(updatedPositions);
          }
        } catch {
          // Fallback: optimistic local update on network error
          setTransactions((prev) => [tx, ...prev]);
          setPositions(updatedPositions);
        }
      };

      postTx();
    },
    [isGuest, session?.access_token]
  );

  return { positions, transactions, setPositions, setTransactions, addTransaction, isGuest, loading };
}
