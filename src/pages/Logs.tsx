import { useEffect, useState } from "react";
import { Search, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { DeliveryLog } from "@/lib/api-types";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Logs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadLogs = async () => {
      try {
        const response = await fetch("/api/logs");
        if (!response.ok) {
          throw new Error("Failed to load logs");
        }
        const payload = (await response.json()) as { logs?: DeliveryLog[] };
        if (mounted) {
          setLogs(payload.logs || []);
        }
      } catch {
        toast.error("Unable to load logs");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = logs.filter((log) => {
    const matchSearch = log.recipient.toLowerCase().includes(search.toLowerCase())
      || log.campaignName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCsv = () => {
    const header = "Campaign,Recipient,Status,Timestamp,Error\n";
    const rows = filtered
      .map((log) => `${log.campaignName},${log.recipient},${log.status},${log.timestamp},${log.error || ""}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track email delivery status</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="rounded-xl">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-1.5">
          {["all", "sent", "failed", "pending"].map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
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
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-card-foreground">{log.campaignName}</td>
                  <td className="px-5 py-3 text-card-foreground">{log.recipient}</td>
                  <td className="px-5 py-3"><StatusBadge status={log.status} type="log" /></td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-3 text-destructive text-xs">{log.error || "—"}</td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No logs found
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
