const campaignStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-accent text-accent-foreground",
  sending: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const logStatusColors: Record<string, string> = {
  sent: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
};

export function StatusBadge({ status, type = "campaign" }: { status: string; type?: "campaign" | "log" }) {
  const normalized = status.toLowerCase();
  const colorClass = type === "campaign"
    ? campaignStatusColors[normalized] || "bg-muted text-muted-foreground"
    : logStatusColors[normalized] || "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {normalized}
    </span>
  );
}
