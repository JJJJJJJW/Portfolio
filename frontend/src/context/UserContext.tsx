import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Toast } from "../components/common/Toast";

export interface DbUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  access_token: string;
}

interface UserContextType {
  user: DbUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string, avatarUrl: string, currency: string) => Promise<boolean>;
  isAuthenticated: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Synchronizes the user session with our Spring Boot backend
  const syncUserWithBackend = async (currentSession: Session) => {
    try {
      if (import.meta.env.DEV) console.log("[UserContext] Syncing session with backend.");
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (response.ok) {
        const dbUserData: DbUser = await response.json();
        if (import.meta.env.DEV) console.log("[UserContext] Sync successful! User:", dbUserData.displayName);
        setUser(dbUserData);
      } else {
        if (import.meta.env.DEV) console.warn("[UserContext] Failed to sync user with backend. Status:", response.status);
        setUser(null);
        setSession(null);
        localStorage.removeItem("techfolio_session");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("[UserContext] Network error syncing user with backend:", err);
      setUser(null);
      setSession(null);
      localStorage.removeItem("techfolio_session");
    }
  };

  useEffect(() => {
    const initSession = async () => {
      // First, check if Supabase has a session (handles OAuth redirect callback)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession?.access_token) {
        // User authenticated via Supabase OAuth (Google sign-in)
        const newSession = { access_token: supabaseSession.access_token };
        setSession(newSession);
        localStorage.setItem("techfolio_session", JSON.stringify(newSession));
        
        const isOAuthRedirect = window.location.hash.includes("access_token") || 
                                window.location.search.includes("code=") ||
                                window.location.hash.includes("id_token") ||
                                sessionStorage.getItem("google_signin_in_progress") === "true";
        if (isOAuthRedirect) {
          sessionStorage.setItem("just_logged_in", "true");
          sessionStorage.removeItem("google_signin_in_progress");
        }

        await syncUserWithBackend(newSession);

        if (isOAuthRedirect) {
          showToast("Welcome! Successfully signed in with Google.", "success");
        }
        setLoading(false);
        return;
      }

      // Fall back to locally stored session (email/password sign-in)
      const storedSession = localStorage.getItem("techfolio_session");
      if (storedSession) {
        try {
          const parsedSession: Session = JSON.parse(storedSession);
          setSession(parsedSession);
          await syncUserWithBackend(parsedSession);
        } catch (e) {
          if (import.meta.env.DEV) console.error("Failed to parse stored session:", e);
          localStorage.removeItem("techfolio_session");
        }
      }
      setLoading(false);
    };

    initSession();

    // Listen for Supabase auth state changes (handles token refresh & OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supabaseSession) => {
        if (event === "SIGNED_IN" && supabaseSession?.access_token) {
          const newSession = { access_token: supabaseSession.access_token };
          setSession(newSession);
          localStorage.setItem("techfolio_session", JSON.stringify(newSession));

          // Check if this was a fresh OAuth sign-in redirect to avoid scrolling on simple page reloads
          const isOAuthRedirect = window.location.hash.includes("access_token") || 
                                  window.location.search.includes("code=") ||
                                  window.location.hash.includes("id_token") ||
                                  sessionStorage.getItem("google_signin_in_progress") === "true";
          if (isOAuthRedirect) {
            sessionStorage.setItem("just_logged_in", "true");
            sessionStorage.removeItem("google_signin_in_progress");
          }

          await syncUserWithBackend(newSession);

          if (isOAuthRedirect) {
            showToast("Welcome! Successfully signed in with Google.", "success");
          }
        } else if (event === "TOKEN_REFRESHED" && supabaseSession?.access_token) {
          const newSession = { access_token: supabaseSession.access_token };
          setSession(newSession);
          localStorage.setItem("techfolio_session", JSON.stringify(newSession));
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          localStorage.removeItem("techfolio_session");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token || data.access_token;
        if (!token) {
          throw new Error("No token returned from backend login");
        }

        const newSession = { access_token: token };
        setSession(newSession);
        localStorage.setItem("techfolio_session", JSON.stringify(newSession));
        sessionStorage.setItem("just_logged_in", "true");
        await syncUserWithBackend(newSession);
        showToast("Welcome back! Successfully signed in.", "success");
        return { success: true };
      } else {
        const errText = await response.text().catch(() => "Login failed");
        return { success: false, error: errText || `Login failed (Status: ${response.status})` };
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Login request failed:", err);
      return { success: false, error: err.message || "Network error. Please make sure the backend is running." };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // The browser will redirect to Google — success is handled by the
      // onAuthStateChange listener after the redirect callback
      return { success: true };
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Google sign-in failed:", err);
      return { success: false, error: err.message || "Google sign-in failed" };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errText = await response.text().catch(() => "Registration failed");
        return { success: false, error: errText || `Registration failed (Status: ${response.status})` };
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Registration request failed:", err);
      return { success: false, error: err.message || "Network error. Please make sure the backend is running." };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Sign out from Supabase (clears OAuth session)
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem("techfolio_session");
      showToast("Successfully signed out. Goodbye!", "success");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error signing out:", err);
      showToast("Sign out failed", "error");
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
      if (import.meta.env.DEV) console.error("Error updating profile:", err);
      return false;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateProfile,
        isAuthenticated: !!user,
        showToast,
      }}
    >
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
