import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";

export interface DbUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface UserContextType {
  user: DbUser | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string, avatarUrl: string, currency: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronizes the user session with our Spring Boot backend
  const syncUserWithBackend = async (currentSession: Session) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (response.ok) {
        const dbUserData: DbUser = await response.json();
        setUser(dbUserData);
      } else {
        console.error("Failed to sync user with backend:", response.statusText);
        setUser(null);
      }
    } catch (err) {
      console.error("Network error syncing user with backend:", err);
      setUser(null);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        syncUserWithBackend(initialSession).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        setLoading(true);
        syncUserWithBackend(currentSession).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error signing in with Google:", err);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (displayName: string, avatarUrl: string, currency: string): Promise<boolean> => {
    if (!session) return false;

    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ displayName, avatarUrl, currency }),
      });

      if (response.ok) {
        const updatedUser: DbUser = await response.json();
        setUser(updatedUser);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating profile:", err);
      return false;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
