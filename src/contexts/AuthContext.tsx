import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "admin" | "manager" | "user";

interface User {
  username: string;
  displayName: string;
  email: string;
  domain: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, domain: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  canAccessSettings: boolean;
  canManageUsers: boolean;
}

interface LoginResponse {
  user: User;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || "Authentication failed";
  } catch {
    return "Authentication failed";
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem("mti_auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string, domain: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          domain,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        throw new Error(message);
      }

      const payload = (await response.json()) as LoginResponse;
      if (!payload.user) {
        throw new Error("Authentication failed");
      }

      sessionStorage.setItem("mti_auth_user", JSON.stringify(payload.user));
      setUser(payload.user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("mti_auth_user");
    setUser(null);
    setError(null);
  }, []);

  const canAccessSettings = user?.role === "admin" || user?.role === "manager";
  const canManageUsers = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, error, canAccessSettings, canManageUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
