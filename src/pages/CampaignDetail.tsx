import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignSummary, DeliveryLog } from "@/lib/api-types";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      if (!id) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/campaigns/${id}`);
        if (response.status === 404) {
          if (mounted) {
            setCampaign(null);
            setLogs([]);
          }
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load campaign");
        }

        const payload = (await response.json()) as {
          campaign?: CampaignSummary;
          logs?: DeliveryLog[];
        };
        if (!mounted) {
          return;
        }
        setCampaign(payload.campaign || null);
        setLogs(payload.logs || []);
      } catch {
        toast.error("Unable to load campaign detail");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!isLoading && !campaign) {
    return (
      <div className="text-center py-20">
        <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Campaign not found</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate('/campaigns')}>Back</Button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Loading campaign...</p>
      </div>
    );
  }

  const handleDispatchNow = async () => {
    if (!id) {
      return;
    }
    setIsDispatching(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/dispatch`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to trigger dispatch");
      }
      toast.success("Dispatch started");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to dispatch campaign";
      toast.error(message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!id) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (response.status === 404) {
        toast.error("Campaign not found");
        navigate("/campaigns");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }
      toast.success("Campaign deleted");
      navigate("/campaigns");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to delete campaign";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const progress = campaign.totalRecipients > 0 ? Math.round(((campaign.sent + campaign.failed) / campaign.totalRecipients) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleDispatchNow()} disabled={isDispatching}>
            Dispatch Now
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleDeleteCampaign()} disabled={isDeleting} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{campaign.subject}</p>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-card-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[
            { label: 'Total', value: campaign.totalRecipients },
            { label: 'Sent', value: campaign.sent },
            { label: 'Failed', value: campaign.failed },
            { label: 'Sender', value: campaign.sender },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold text-card-foreground">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
            </div>
          ))}
        </div>
        {campaign.attachments && campaign.attachments.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Attachments</p>
            <div className="space-y-2">
              {campaign.attachments.map((attachment) => (
                <div key={attachment.name} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-sm text-card-foreground">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground">{Math.ceil(attachment.sizeBytes / 1024)} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-card-foreground">Delivery Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-3 text-card-foreground">{log.recipient}</td>
                  <td className="px-5 py-3"><StatusBadge status={log.status} type="log" /></td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-3 text-destructive text-xs">{log.error || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
