import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    tenantId: "", clientId: "", defaultSender: "", batchSize: "50", batchDelay: "2", recipientWarning: "100",
  });

  const update = (key: string, val: string) => setConfig(c => ({ ...c, [key]: val }));

  const handleSave = () => toast.success("Settings saved (demo mode)");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure Microsoft Graph API and sending parameters</p>
      </div>

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

      <Button onClick={handleSave} className="rounded-xl">Save Settings</Button>
    </div>
  );
}
