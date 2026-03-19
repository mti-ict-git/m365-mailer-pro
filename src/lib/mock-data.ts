export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  sender: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface Recipient {
  email: string;
  name?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface LogEntry {
  id: string;
  campaignId: string;
  campaignName: string;
  recipient: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  error?: string;
}

export const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Q1 Newsletter', subject: 'MTI Q1 2026 Updates', status: 'completed', sender: 'marketing@mti.com', totalRecipients: 1250, sent: 1238, failed: 12, createdAt: '2026-03-01', completedAt: '2026-03-01' },
  { id: '2', name: 'Product Launch', subject: 'Introducing Our New Platform', status: 'sending', sender: 'product@mti.com', totalRecipients: 890, sent: 456, failed: 3, createdAt: '2026-03-15' },
  { id: '3', name: 'Team Updates', subject: 'March Team Sync', status: 'scheduled', sender: 'hr@mti.com', totalRecipients: 340, sent: 0, failed: 0, createdAt: '2026-03-18', scheduledAt: '2026-03-20T09:00:00' },
  { id: '4', name: 'Event Invite', subject: 'You\'re Invited: Annual Summit', status: 'draft', sender: 'events@mti.com', totalRecipients: 0, sent: 0, failed: 0, createdAt: '2026-03-19' },
  { id: '5', name: 'Security Alert', subject: 'Important: Password Policy Update', status: 'completed', sender: 'security@mti.com', totalRecipients: 2100, sent: 2098, failed: 2, createdAt: '2026-02-28', completedAt: '2026-02-28' },
  { id: '6', name: 'Customer Survey', subject: 'Help Us Improve', status: 'completed', sender: 'feedback@mti.com', totalRecipients: 560, sent: 548, failed: 12, createdAt: '2026-02-20', completedAt: '2026-02-20' },
];

export const mockLogs: LogEntry[] = [
  { id: '1', campaignId: '1', campaignName: 'Q1 Newsletter', recipient: 'john@example.com', status: 'sent', timestamp: '2026-03-01T10:00:15' },
  { id: '2', campaignId: '1', campaignName: 'Q1 Newsletter', recipient: 'jane@example.com', status: 'sent', timestamp: '2026-03-01T10:00:16' },
  { id: '3', campaignId: '1', campaignName: 'Q1 Newsletter', recipient: 'invalid@bad', status: 'failed', timestamp: '2026-03-01T10:00:17', error: 'Invalid mailbox' },
  { id: '4', campaignId: '2', campaignName: 'Product Launch', recipient: 'alice@corp.com', status: 'sent', timestamp: '2026-03-15T14:30:00' },
  { id: '5', campaignId: '2', campaignName: 'Product Launch', recipient: 'bob@corp.com', status: 'sent', timestamp: '2026-03-15T14:30:01' },
  { id: '6', campaignId: '2', campaignName: 'Product Launch', recipient: 'charlie@old.com', status: 'failed', timestamp: '2026-03-15T14:30:02', error: 'Mailbox not found' },
  { id: '7', campaignId: '5', campaignName: 'Security Alert', recipient: 'dev1@mti.com', status: 'sent', timestamp: '2026-02-28T08:00:00' },
  { id: '8', campaignId: '5', campaignName: 'Security Alert', recipient: 'dev2@mti.com', status: 'sent', timestamp: '2026-02-28T08:00:01' },
];

export const getStatusColor = (status: CampaignStatus) => {
  const map: Record<CampaignStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-accent text-accent-foreground',
    sending: 'bg-primary/10 text-primary',
    completed: 'bg-success/10 text-success',
    failed: 'bg-destructive/10 text-destructive',
  };
  return map[status];
};

export const getLogStatusColor = (status: string) => {
  const map: Record<string, string> = {
    sent: 'bg-success/10 text-success',
    failed: 'bg-destructive/10 text-destructive',
    pending: 'bg-warning/10 text-warning',
  };
  return map[status] || 'bg-muted text-muted-foreground';
};
