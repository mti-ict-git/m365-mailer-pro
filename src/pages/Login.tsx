import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Shield, Lock, User, Server, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import loginBg from "@/assets/login-bg.jpg";

const DEFAULT_DOMAINS = [
  { value: "mti.local", label: "MTI Corporate (mti.local)" },
  { value: "mti.com", label: "MTI Cloud (mti.com)" },
];

interface SettingsResponse {
  ldap?: {
    domains?: Array<{
      id: string;
      label: string;
    }>;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [domains, setDomains] = useState(DEFAULT_DOMAINS);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState(DEFAULT_DOMAINS[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!username.trim()) {
      setLocalError("Please enter your username");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password");
      return;
    }

    try {
      await login(username.trim(), password, domain);
      navigate("/", { replace: true });
    } catch {
      // error is set in context
    }
  };

  const displayError = localError || error;

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const response = await fetch("/api/auth/settings");
        if (!response.ok) {
          throw new Error("Failed");
        }
        const settings = (await response.json()) as SettingsResponse;
        const backendDomains = settings.ldap?.domains || [];
        if (backendDomains.length === 0) {
          return;
        }
        const normalizedDomains = backendDomains.map((item) => ({
          value: item.id,
          label: item.label,
        }));
        setDomains(normalizedDomains);
        setDomain(normalizedDomains[0].value);
      } catch {
        setDomains(DEFAULT_DOMAINS);
      }
    };
    void loadDomains();
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%)]/90 via-[hsl(217,91%,20%)]/80 to-[hsl(217,91%,50%)]/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-[hsl(0,0%,100%)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[hsl(0,0%,100%)]/10 backdrop-blur-sm flex items-center justify-center border border-[hsl(0,0%,100%)]/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">MTI Email Blaster</span>
              <p className="text-xs text-[hsl(0,0%,100%)]/60">Enterprise Email Platform</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6 max-w-md"
          >
            <h2 className="text-3xl font-bold leading-tight">
              Secure Enterprise<br />Email Delivery
            </h2>
            <p className="text-[hsl(0,0%,100%)]/70 leading-relaxed">
              Send bulk emails through Microsoft 365 with full control, tracking, and safety. Authenticated via your organization's Active Directory.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { icon: Shield, text: "LDAP / Active Directory Authentication" },
                { icon: Server, text: "Microsoft Graph API Integration" },
                { icon: Lock, text: "Enterprise-grade Security" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-[hsl(0,0%,100%)]/80">
                  <div className="h-7 w-7 rounded-lg bg-[hsl(0,0%,100%)]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-[hsl(0,0%,100%)]/40">
            © {new Date().getFullYear()} MTI Corporation. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">MTI Email Blaster</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your organization credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Domain selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Directory
              </Label>
              <div className="flex gap-2">
                {domains.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDomain(d.value)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      domain === d.value
                        ? "bg-primary/5 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <Server className="h-3.5 w-3.5 mx-auto mb-1" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sAMAccountName"
                  className="pl-10 rounded-xl h-11"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {domain === "mti.local" ? "Use your sAMAccountName, e.g. john.doe or DOMAIN\\john.doe" : "Use your Active Directory sAMAccountName"}
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 rounded-xl h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {displayError}
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl h-11 text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Sign in with Active Directory
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Having trouble? Contact your IT administrator
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Lock className="h-3 w-3" />
              Secured with LDAPS · TLS 1.3
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
