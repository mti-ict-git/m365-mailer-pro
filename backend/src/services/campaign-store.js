import { query, withTransaction } from "../db/client.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxAttachmentCount = 5;
const maxAttachmentBytes = 3 * 1024 * 1024;
const maxTotalAttachmentBytes = 10 * 1024 * 1024;

const toBase64Size = (value) => {
  if (typeof value !== "string") {
    return 0;
  }
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
};

const toAttachmentMeta = (attachment) => ({
  name: attachment.name,
  contentType: attachment.contentType,
  sizeBytes: attachment.sizeBytes,
});

const sanitizeAttachmentRows = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value.map((attachment) => {
    const row = attachment && typeof attachment === "object" ? attachment : {};
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const contentType = typeof row.contentType === "string" ? row.contentType.trim() : "application/octet-stream";
    const contentBytes = typeof row.contentBytes === "string" ? row.contentBytes.trim() : "";
    const sizeBytes = toBase64Size(contentBytes);
    return {
      name,
      contentType,
      contentBytes,
      sizeBytes,
    };
  }).filter((attachment) => Boolean(attachment.name) && Boolean(attachment.contentBytes));

  if (normalized.length > maxAttachmentCount) {
    throw withStatusCode(`Maximum ${maxAttachmentCount} attachments allowed`, 400);
  }

  let totalSize = 0;
  for (const attachment of normalized) {
    if (attachment.sizeBytes <= 0) {
      throw withStatusCode(`Attachment is invalid: ${attachment.name}`, 400);
    }
    if (attachment.sizeBytes > maxAttachmentBytes) {
      throw withStatusCode(`Attachment too large: ${attachment.name}`, 400);
    }
    totalSize += attachment.sizeBytes;
  }

  if (totalSize > maxTotalAttachmentBytes) {
    throw withStatusCode("Total attachment size exceeds 10MB", 400);
  }

  return normalized;
};

const mapCampaign = (row) => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  sender: row.sender,
  bodyHtml: row.body_html || "",
  status: row.status,
  totalRecipients: Number(row.total_recipients || 0),
  sent: Number(row.sent_count || 0),
  failed: Number(row.failed_count || 0),
  createdAt: row.created_at,
  scheduledAt: row.scheduled_at,
  completedAt: row.completed_at,
  attachments: sanitizeAttachmentRows(row.attachments_json).map(toAttachmentMeta),
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

const mapRecipient = (row) => ({
  email: row.email,
  name: row.recipient_name || undefined,
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
    `SELECT id, name, subject, sender, body_html, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at, attachments_json
     FROM campaigns
     ORDER BY created_at DESC`,
  );
  return result.rows.map(mapCampaign);
};

export const getCampaignById = async (campaignId) => {
  const result = await query(
    `SELECT id, name, subject, sender, body_html, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at, attachments_json
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

export const listCampaignRecipients = async (campaignId) => {
  const result = await query(
    `SELECT email, recipient_name
     FROM recipients
     WHERE campaign_id = $1
     ORDER BY created_at ASC`,
    [campaignId],
  );

  return result.rows.map(mapRecipient);
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
  const attachments = sanitizeAttachmentRows(payload.attachments);
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
        (name, subject, sender, body_html, attachments_json, status, total_recipients, sent_count, failed_count, scheduled_at, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5::jsonb, 'scheduled', $6, 0, 0, NOW(), NOW(), NOW())
       RETURNING id, name, subject, sender, body_html, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at, attachments_json`,
      [name, subject, sender, bodyHtml, JSON.stringify(attachments), recipients.length],
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

export const updateCampaign = async (campaignId, payload) => {
  const currentResult = await query(
    `SELECT id, name, subject, sender, body_html, attachments_json
     FROM campaigns
     WHERE id = $1
     LIMIT 1`,
    [campaignId],
  );
  if (!currentResult.rows[0]) {
    return null;
  }

  const current = currentResult.rows[0];
  const name = typeof payload.name === "string" ? payload.name.trim() : current.name;
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : current.subject;
  const sender = typeof payload.sender === "string" ? payload.sender.trim().toLowerCase() : current.sender;
  const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml : current.body_html || "";
  const recipients = sanitizeRecipients(payload.recipients);
  const hasAttachmentsPayload = Object.prototype.hasOwnProperty.call(payload, "attachments");
  const attachments = hasAttachmentsPayload
    ? sanitizeAttachmentRows(payload.attachments)
    : sanitizeAttachmentRows(current.attachments_json);

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

  const updatedCampaign = await withTransaction(async (runner) => {
    const campaignResult = await runner(
      `UPDATE campaigns
       SET name = $2,
           subject = $3,
           sender = $4,
           body_html = $5,
           attachments_json = $6::jsonb,
           status = 'scheduled',
           total_recipients = $7,
           sent_count = 0,
           failed_count = 0,
           scheduled_at = NOW(),
           completed_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, subject, sender, body_html, status, total_recipients, sent_count, failed_count, created_at, scheduled_at, completed_at, attachments_json`,
      [campaignId, name, subject, sender, bodyHtml, JSON.stringify(attachments), recipients.length],
    );

    await runner("DELETE FROM recipients WHERE campaign_id = $1", [campaignId]);
    for (const recipient of recipients) {
      await runner(
        `INSERT INTO recipients (campaign_id, email, recipient_name, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [campaignId, recipient.email, recipient.name || null],
      );
    }

    return campaignResult.rows[0];
  });

  return mapCampaign(updatedCampaign);
};

export const deleteCampaign = async (campaignId) => {
  const result = await query(
    `DELETE FROM campaigns
     WHERE id = $1`,
    [campaignId],
  );
  return result.rowCount > 0;
};
