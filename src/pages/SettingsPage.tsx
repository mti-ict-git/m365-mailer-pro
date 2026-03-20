import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { UserManagement } from "@/components/UserManagement";

interface BackendSettings {
  application?: {
    defaultBatchSize?: number;
    defaultBatchDelaySeconds?: number;
  };
  mail?: {
    defaultSender?: string;
    recipientWarningThreshold?: number;
    microsoftGraph?: {
      tenantId?: string;
      clientId?: string;
      scope?: string;
      hasClientSecret?: boolean;
    };
  };
}

export default function SettingsPage() {
  const { canManageUsers } = useAuth();
  const [config, setConfig] = useState({
    tenantId: "", clientId: "", defaultSender: "", batchSize: "50", batchDelay: "2", recipientWarning: "100",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const update = (key: string, val: string) => setConfig(c => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/auth/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: {
            defaultBatchSize: Number.parseInt(config.batchSize, 10),
            defaultBatchDelaySeconds: Number.parseInt(config.batchDelay, 10),
          },
          mail: {
            defaultSender: config.defaultSender,
            recipientWarningThreshold: Number.parseInt(config.recipientWarning, 10),
            microsoftGraph: {
              tenantId: config.tenantId,
              clientId: config.clientId,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Settings saved");
    } catch {
      toast.error("Unable to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const response = await apiFetch("/api/auth/settings/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: testRecipient,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "Failed to send test email");
      }

      toast.success("Test email sent");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to send test email";
      toast.error(message);
    } finally {
      setIsSendingTest(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const response = await apiFetch("/api/auth/settings");
        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const settings = (await response.json()) as BackendSettings;
        if (!isMounted) {
          return;
        }

        setConfig((previous) => ({
          ...previous,
          tenantId: settings.mail?.microsoftGraph?.tenantId || previous.tenantId,
          clientId: settings.mail?.microsoftGraph?.clientId || previous.clientId,
          defaultSender: settings.mail?.defaultSender || previous.defaultSender,
          batchSize: String(settings.application?.defaultBatchSize ?? previous.batchSize),
          batchDelay: String(settings.application?.defaultBatchDelaySeconds ?? previous.batchDelay),
          recipientWarning: String(settings.mail?.recipientWarningThreshold ?? previous.recipientWarning),
        }));
      } catch {
        toast.error("Unable to load backend settings");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure Microsoft Graph API and manage users</p>
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          {canManageUsers && <TabsTrigger value="users">User Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border p-6 space-y-5">
            <h2 className="text-sm font-semibold text-card-foreground">Microsoft 365 Configuration</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tenant ID</Label>
                <Input value={config.tenantId} onChange={e => update('tenantId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="rounded-xl font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={config.clientId} onChange={e => update('clientId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="rounded-xl font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Default Sender</Label>
                <Input value={config.defaultSender} onChange={e => update('defaultSender', e.target.value)} placeholder="noreply@mti.com" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="space-y-2">
                  <Label>Test Recipient</Label>
                  <Input
                    value={testRecipient}
                    onChange={(event) => setTestRecipient(event.target.value)}
                    placeholder="you@company.com"
                    className="rounded-xl"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleSendTestEmail()}
                  disabled={isLoading || isSaving || isSendingTest || !testRecipient.trim()}
                  className="rounded-xl"
                >
                  Send Test Email
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card border p-6 space-y-5">
            <h2 className="text-sm font-semibold text-card-foreground">Rate Limiting & Safety</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input type="number" value={config.batchSize} onChange={e => update('batchSize', e.target.value)} className="rounded-xl" />
                <p className="text-xs text-muted-foreground">Emails per batch</p>
              </div>
              <div className="space-y-2">
                <Label>Batch Delay (sec)</Label>
                <Input type="number" value={config.batchDelay} onChange={e => update('batchDelay', e.target.value)} className="rounded-xl" />
                <p className="text-xs text-muted-foreground">Seconds between batches</p>
              </div>
              <div className="space-y-2">
                <Label>Warning Threshold</Label>
                <Input type="number" value={config.recipientWarning} onChange={e => update('recipientWarning', e.target.value)} className="rounded-xl" />
                <p className="text-xs text-muted-foreground">Warn if recipients exceed</p>
              </div>
            </div>
          </motion.div>

          <Button onClick={() => void handleSave()} disabled={isLoading || isSaving} className="rounded-xl">Save Settings</Button>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border p-6">
              <h2 className="text-sm font-semibold text-card-foreground mb-4">User Management</h2>
              <p className="text-sm text-muted-foreground mb-6">Manage user roles and permissions. Admins have full access, managers can access settings and all campaigns, users can only access their own campaigns.</p>
              <UserManagement />
            </motion.div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
