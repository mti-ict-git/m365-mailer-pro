const readString = (value, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const isValidEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const withStatusCode = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const sanitizeGraphAttachments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((attachment) => {
    const source = attachment && typeof attachment === "object" ? attachment : {};
    return {
      name: readString(source.name),
      contentType: readString(source.contentType, "application/octet-stream"),
      contentBytes: readString(source.contentBytes),
    };
  }).filter((attachment) => Boolean(attachment.name) && Boolean(attachment.contentBytes));
};

export const requestGraphToken = async ({ tenantId, clientId, clientSecret, scope }) => {
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw withStatusCode("Failed to acquire Microsoft Graph token. Check Microsoft Graph credentials.", 400);
  }

  const payload = await response.json();
  const accessToken = readString(payload.access_token);
  if (!accessToken) {
    throw withStatusCode("Microsoft Graph token response missing access token", 502);
  }

  return accessToken;
};

export const resolveGraphAuth = (settings, options = {}) => {
  const requireSender = options && typeof options === "object" && options.requireSender === true;
  const mail = settings?.mail && typeof settings.mail === "object" ? settings.mail : {};
  const graph = mail.microsoftGraph && typeof mail.microsoftGraph === "object"
    ? mail.microsoftGraph
    : {};
  const tenantId = readString(graph.tenantId);
  const clientId = readString(graph.clientId);
  const clientSecret = readString(graph.clientSecret);
  const scope = readString(graph.scope, "https://graph.microsoft.com/.default");
  const sender = readString(mail.defaultSender);

  if (!tenantId || !clientId || !clientSecret) {
    throw withStatusCode("Microsoft Graph credentials are incomplete", 400);
  }
  if (requireSender && (!sender || !isValidEmail(sender))) {
    throw withStatusCode("Default sender email is invalid", 400);
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    scope,
    sender,
  };
};

export const sendGraphMail = async ({
  accessToken,
  sender,
  recipient,
  subject,
  htmlContent,
  attachments,
}) => {
  if (!isValidEmail(sender)) {
    throw withStatusCode("Sender email is invalid", 400);
  }
  if (!isValidEmail(recipient)) {
    throw withStatusCode("Recipient email is invalid", 400);
  }

  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const normalizedAttachments = sanitizeGraphAttachments(attachments).map((attachment) => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: attachment.name,
    contentType: attachment.contentType,
    contentBytes: attachment.contentBytes,
  }));

  const mailPayload = {
    message: {
      subject: readString(subject, "MTI Email Blaster Message"),
      body: {
        contentType: "HTML",
        content: readString(htmlContent, "<p></p>"),
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipient.trim(),
          },
        },
      ],
      attachments: normalizedAttachments,
    },
    saveToSentItems: true,
  };

  const response = await fetch(sendMailUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mailPayload),
  });

  if (!response.ok) {
    throw withStatusCode("Microsoft Graph rejected email send request.", 400);
  }
};
