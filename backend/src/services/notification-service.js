import { loadAppSettingsInternal } from "./config-store.js";
import { requestGraphToken, sendGraphMail } from "./graph-mail.js";

const readString = (value, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const isValidEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Sends an access request notification email to all admin users.
 * This is called when a new user logs in for the first time and is assigned 'pending' role.
 */
export const sendAccessRequestNotification = async ({ newUser, adminEmails }) => {
  if (!adminEmails || adminEmails.length === 0) {
    console.warn("[notification-service] No admin emails available for access request notification");
    return { sent: false, reason: "no_admin_emails" };
  }

  let settings;
  try {
    settings = await loadAppSettingsInternal();
  } catch (error) {
    console.error("[notification-service] Failed to load settings:", error);
    return { sent: false, reason: "settings_unavailable" };
  }

  const mail = settings?.mail && typeof settings.mail === "object" ? settings.mail : {};
  const graph = mail.microsoftGraph && typeof mail.microsoftGraph === "object" ? mail.microsoftGraph : {};

  const systemSender = readString(mail.systemNotificationSender);
  const tenantId = readString(graph.tenantId);
  const clientId = readString(graph.clientId);
  const clientSecret = readString(graph.clientSecret);
  const scope = readString(graph.scope, "https://graph.microsoft.com/.default");

  if (!systemSender || !isValidEmail(systemSender)) {
    console.warn("[notification-service] System notification sender is not configured");
    return { sent: false, reason: "system_sender_not_configured" };
  }

  if (!tenantId || !clientId || !clientSecret) {
    console.warn("[notification-service] Microsoft Graph credentials are incomplete");
    return { sent: false, reason: "graph_credentials_incomplete" };
  }

  let accessToken;
  try {
    accessToken = await requestGraphToken({ tenantId, clientId, clientSecret, scope });
  } catch (error) {
    console.error("[notification-service] Failed to acquire Graph token:", error);
    return { sent: false, reason: "token_acquisition_failed" };
  }

  const subject = `New Access Request: ${newUser.displayName || newUser.username}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New User Access Request</h2>
      <p>A new user has requested access to the Email Campaign system:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Username</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(newUser.username)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Display Name</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(newUser.displayName || "-")}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Email</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(newUser.email || "-")}</td>
        </tr>
      </table>
      <p>To approve this user, go to <strong>Settings &gt; User Management</strong> and change their role from "Pending" to "User" or another appropriate role.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated notification from the Email Campaign System.</p>
    </div>
  `;

  const results = [];
  for (const adminEmail of adminEmails) {
    try {
      await sendGraphMail({
        accessToken,
        sender: systemSender,
        recipient: adminEmail,
        subject,
        htmlContent,
        attachments: [],
      });
      results.push({ email: adminEmail, success: true });
    } catch (error) {
      console.error(`[notification-service] Failed to send notification to ${adminEmail}:`, error);
      results.push({ email: adminEmail, success: false, error: error.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[notification-service] Access request notifications sent: ${successCount}/${adminEmails.length}`);

  return { sent: successCount > 0, results };
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
