import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface User {
  username: string;
  displayName: string;
  email: string;
  domain: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, domain: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

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
      // Simulate LDAP authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Demo validation — replace with real LDAP/AD API call
      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      if (password.length < 3) {
        throw new Error("Invalid credentials. Please check your username and password.");
      }

      const authenticatedUser: User = {
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1).replace(/[._]/g, " "),
        email: `${username}@${domain}`,
        domain,
      };

      sessionStorage.setItem("mti_auth_user", JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("mti_auth_user");
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
