import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";

export function PendingAccessScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-card border p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account <span className="font-medium text-foreground">{user?.username}</span> has been created, but access to the application is pending administrator approval.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
          <p>An administrator has been notified of your request and will review it shortly. Once approved, you'll be able to access the application.</p>
        </div>

        <div className="pt-4">
          <Button variant="outline" onClick={logout} className="rounded-xl">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
