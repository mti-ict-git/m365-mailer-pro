import { query } from "../db/client.js";
import { loadAppSettingsInternal } from "./config-store.js";
import { requestGraphToken, resolveGraphAuth, sanitizeGraphAttachments, sendGraphMail } from "./graph-mail.js";

const getCampaignForDispatch = async (campaignId) => {
  const result = await query(
    `SELECT id, sender, subject, body_html, attachments_json, sent_count, failed_count
     FROM campaigns
     WHERE id = $1
     LIMIT 1`,
    [campaignId],
  );
  return result.rows[0] || null;
};

const getPendingRecipients = async (campaignId) => {
  const result = await query(
    `SELECT id, email
     FROM recipients
     WHERE campaign_id = $1 AND status = 'pending'
     ORDER BY created_at ASC`,
    [campaignId],
  );
  return result.rows;
};

const markCampaignStatus = async (campaignId, status) => {
  await query(
    `UPDATE campaigns
     SET status = $2, updated_at = NOW()
     WHERE id = $1`,
    [campaignId, status],
  );
};

const completeCampaign = async ({ campaignId, sentCount, failedCount, status }) => {
  await query(
    `UPDATE campaigns
     SET sent_count = $2, failed_count = $3, status = $4, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [campaignId, sentCount, failedCount, status],
  );
};

const failPendingRecipients = async ({ campaignId, message }) => {
  await query(
    `UPDATE recipients
     SET status = 'failed', error_message = $2
     WHERE campaign_id = $1 AND status = 'pending'`,
    [campaignId, message.slice(0, 500)],
  );
};

export const dispatchCampaign = async (campaignId) => {
  const campaign = await getCampaignForDispatch(campaignId);
  if (!campaign) {
    return;
  }

  const pendingRecipients = await getPendingRecipients(campaignId);
  if (pendingRecipients.length === 0) {
    return;
  }

  await markCampaignStatus(campaignId, "sending");

  const attachments = sanitizeGraphAttachments(campaign.attachments_json);

  try {
    const settings = await loadAppSettingsInternal();
    const auth = resolveGraphAuth(settings);
    const sender = String(campaign.sender || "").trim().toLowerCase() || auth.sender;
    const accessToken = await requestGraphToken(auth);

    let sentCount = Number(campaign.sent_count || 0);
    let failedCount = Number(campaign.failed_count || 0);

    for (const recipient of pendingRecipients) {
      try {
        await sendGraphMail({
          accessToken,
          sender,
          recipient: recipient.email,
          subject: String(campaign.subject || ""),
          htmlContent: String(campaign.body_html || "<p></p>"),
          attachments,
        });
        sentCount += 1;
        await query(
          `UPDATE recipients
           SET status = 'sent', error_message = NULL
           WHERE id = $1`,
          [recipient.id],
        );
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : "Send failed";
        await query(
          `UPDATE recipients
           SET status = 'failed', error_message = $2
           WHERE id = $1`,
          [recipient.id, message.slice(0, 500)],
        );
      }
    }

    const finalStatus = sentCount > 0 ? "completed" : "failed";
    await completeCampaign({
      campaignId,
      sentCount,
      failedCount,
      status: finalStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign dispatch failed";
    await failPendingRecipients({ campaignId, message });
    const failedCount = Number(campaign.failed_count || 0) + pendingRecipients.length;
    await completeCampaign({
      campaignId,
      sentCount: Number(campaign.sent_count || 0),
      failedCount,
      status: "failed",
    });
  }
};
