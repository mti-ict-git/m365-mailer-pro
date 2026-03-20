import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PendingAccessScreen } from "./PendingAccessScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isPending) {
    return <PendingAccessScreen />;
  }

  return <>{children}</>;
}
