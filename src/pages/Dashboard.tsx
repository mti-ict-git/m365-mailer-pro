import { useEffect, useState } from "react";
import { Mail, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignSummary } from "@/lib/api-types";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCampaigns = async () => {
      try {
        const response = await fetch("/api/campaigns");
        if (!response.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const payload = (await response.json()) as { campaigns?: CampaignSummary[] };
        if (mounted) {
          setCampaigns(payload.campaigns || []);
        }
      } catch {
        toast.error("Unable to load dashboard data");
      }
    };

    void loadCampaigns();
    return () => {
      mounted = false;
    };
  }, []);

  const totalSent = campaigns.reduce((value, campaign) => value + campaign.sent, 0);
  const totalFailed = campaigns.reduce((value, campaign) => value + campaign.failed, 0);
  const successRate = totalSent + totalFailed > 0
    ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your email campaigns</p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')} className="rounded-xl">
          <Mail className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Campaigns" value={campaigns.length} icon={Mail} index={0} />
        <KpiCard title="Emails Sent" value={totalSent.toLocaleString()} icon={Send} index={1} subtitle="Across all campaigns" />
        <KpiCard title="Success Rate" value={`${successRate}%`} icon={CheckCircle} index={2} />
        <KpiCard title="Failed" value={totalFailed} icon={AlertTriangle} index={3} subtitle={`${totalFailed} delivery failures`} />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl shadow-card border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-card-foreground">Recent Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipients</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Success</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.slice(0, 5).map((campaign) => {
                const rate = campaign.sent + campaign.failed > 0
                  ? ((campaign.sent / (campaign.sent + campaign.failed)) * 100).toFixed(1)
                  : "0";
                return (
                  <tr key={campaign.id} className="hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-card-foreground">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={campaign.status} /></td>
                    <td className="px-5 py-3.5 text-card-foreground">{campaign.totalRecipients.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-card-foreground">{campaign.sent.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-card-foreground">{rate}%</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
