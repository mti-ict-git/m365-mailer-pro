import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignStatus, CampaignSummary } from "@/lib/api-types";
import { motion } from "framer-motion";
import { toast } from "sonner";

const statusFilters: (CampaignStatus | 'all')[] = ['all', 'draft', 'scheduled', 'sending', 'completed', 'failed'];

export default function Campaigns() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CampaignStatus | "all">("all");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCampaigns = async () => {
      try {
        const response = await fetch("/api/campaigns");
        if (!response.ok) {
          throw new Error("Failed to load campaigns");
        }
        const payload = (await response.json()) as { campaigns?: CampaignSummary[] };
        if (mounted) {
          setCampaigns(payload.campaigns || []);
        }
      } catch {
        toast.error("Unable to load campaigns");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCampaigns();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = campaigns.filter((campaign) => {
    const matchSearch = campaign.name.toLowerCase().includes(search.toLowerCase())
      || campaign.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || campaign.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your email campaigns</p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((status) => (
            <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl shadow-card border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sender</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipients</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((campaign) => {
                const progress = campaign.totalRecipients > 0
                  ? Math.round(((campaign.sent + campaign.failed) / campaign.totalRecipients) * 100)
                  : 0;
                return (
                  <tr key={campaign.id} onClick={() => navigate(`/campaigns/${campaign.id}`)} className="hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-card-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{campaign.subject}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={campaign.status} /></td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{campaign.sender}</td>
                    <td className="px-5 py-3.5 text-card-foreground">{campaign.totalRecipients.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No campaigns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
