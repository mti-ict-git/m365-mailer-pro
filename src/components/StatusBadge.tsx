import { getStatusColor, getLogStatusColor } from "@/lib/mock-data";

export function StatusBadge({ status, type = 'campaign' }: { status: string; type?: 'campaign' | 'log' }) {
  const colorClass = type === 'campaign' ? getStatusColor(status as any) : getLogStatusColor(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {status}
    </span>
  );
}
