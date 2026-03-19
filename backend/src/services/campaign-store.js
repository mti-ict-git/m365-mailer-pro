import { query, withTransaction } from "../db/client.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapCampaign = (row) => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  sender: row.sender,
  status: row.status,
  totalRecipients: Number(row.total_recipients || 0),
  sent: Number(row.sent_count || 0),
  failed: Number(row.failed_count || 0),
  createdAt: row.created_at,
  scheduledAt: row.scheduled_at,
  completedAt: row.completed_at,
});

const mapLog = (row) => ({
  id: row.id,
  campaignId: row.campaign_id,
  campaignName: row.campaign_name,
  recipient: row.recipient,
  status: row.status,
  timestamp: row.timestamp,
  error: row.error || "",
});

const withStatusCode = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeRecipients = (recipients) => {
  if (!Array.isArray(recipients)) {
    return [];
  }

  const normalized = recipients.map((recipient) => {
    const value = recipient && typeof recipient === "object" ? recipient : {};
    const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
    const name = typeof value.name === "string" ? value.name.trim() : "";
    return {
      email,
      name,
    };
  }).filter((recipient) => Boolean(recipient.email));

  const unique = normalized.filter((recipient, index, list) =>
    list.findIndex((value) => value.email === recipient.email) === index);

  const invalid = unique.find((recipient) => !emailRegex.test(recipient.email));
  if (invalid) {
    throw withStatusCode(`Invalid recipient email: ${invalid.email}`, 400);
  }

  return unique;
};

export const listCampaigns = async () => {
  const result = await query(
    `SELECT id, name, subject, sender, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at
     FROM campaigns
     ORDER BY created_at DESC`,
  );
  return result.rows.map(mapCampaign);
};

export const getCampaignById = async (campaignId) => {
  const result = await query(
    `SELECT id, name, subject, sender, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at
     FROM campaigns
     WHERE id = $1
     LIMIT 1`,
    [campaignId],
  );
  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
};

export const listCampaignLogs = async (campaignId) => {
  const result = await query(
    `SELECT
       recipients.id::text AS id,
       recipients.campaign_id::text AS campaign_id,
       campaigns.name AS campaign_name,
       recipients.email AS recipient,
       recipients.status AS status,
       recipients.created_at AS timestamp,
       recipients.error_message AS error
     FROM recipients
     INNER JOIN campaigns ON campaigns.id = recipients.campaign_id
     WHERE recipients.campaign_id = $1
     ORDER BY recipients.created_at DESC`,
    [campaignId],
  );

  return result.rows.map(mapLog);
};

export const listLogs = async () => {
  const result = await query(
    `SELECT
       recipients.id::text AS id,
       recipients.campaign_id::text AS campaign_id,
       campaigns.name AS campaign_name,
       recipients.email AS recipient,
       recipients.status AS status,
       recipients.created_at AS timestamp,
       recipients.error_message AS error
     FROM recipients
     INNER JOIN campaigns ON campaigns.id = recipients.campaign_id
     ORDER BY recipients.created_at DESC`,
  );

  return result.rows.map(mapLog);
};

export const createCampaign = async (payload) => {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const sender = typeof payload.sender === "string" ? payload.sender.trim().toLowerCase() : "";
  const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";
  const recipients = sanitizeRecipients(payload.recipients);

  if (!name) {
    throw withStatusCode("Campaign name is required", 400);
  }
  if (!subject) {
    throw withStatusCode("Campaign subject is required", 400);
  }
  if (!sender || !emailRegex.test(sender)) {
    throw withStatusCode("Valid sender email is required", 400);
  }
  if (recipients.length === 0) {
    throw withStatusCode("At least one recipient is required", 400);
  }

  const createdCampaign = await withTransaction(async (runner) => {
    const campaignResult = await runner(
      `INSERT INTO campaigns
        (name, subject, sender, body_html, status, total_recipients, sent_count, failed_count, scheduled_at, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, 'scheduled', $5, 0, 0, NOW(), NOW(), NOW())
       RETURNING id, name, subject, sender, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at`,
      [name, subject, sender, bodyHtml, recipients.length],
    );

    const campaign = campaignResult.rows[0];
    for (const recipient of recipients) {
      await runner(
        `INSERT INTO recipients (campaign_id, email, recipient_name, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [campaign.id, recipient.email, recipient.name || null],
      );
    }

    return campaign;
  });

  return mapCampaign(createdCampaign);
};
