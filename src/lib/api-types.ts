export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed" | "failed";
export type LogStatus = "pending" | "sent" | "failed";

export interface CampaignAttachment {
  name: string;
  contentType: string;
  sizeBytes: number;
  contentBytes?: string;
}

export interface CampaignRecipient {
  email: string;
  name?: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  status: CampaignStatus;
  sender: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  createdAt: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  attachments?: CampaignAttachment[];
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
