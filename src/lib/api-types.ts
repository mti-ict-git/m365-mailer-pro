export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed" | "failed";
export type LogStatus = "pending" | "sent" | "failed";

export interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  sender: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  createdAt: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
}

export interface DeliveryLog {
  id: string;
  campaignId: string;
  campaignName: string;
  recipient: string;
  status: LogStatus;
  timestamp: string;
  error?: string;
}
