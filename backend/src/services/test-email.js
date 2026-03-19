const isValidEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const withStatusCode = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const readString = (value, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const toBase64Size = (value) => {
  const normalized = readString(value);
  if (!normalized) {
    return 0;
  }
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
};

const sanitizeAttachments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value.map((attachment) => {
    const source = attachment && typeof attachment === "object" ? attachment : {};
    const name = readString(source.name);
    const contentType = readString(source.contentType, "application/octet-stream");
    const contentBytes = readString(source.contentBytes);
    return {
      name,
      contentType,
      contentBytes,
      sizeBytes: toBase64Size(contentBytes),
    };
  }).filter((attachment) => Boolean(attachment.name) && Boolean(attachment.contentBytes));

  if (normalized.length > 5) {
    throw withStatusCode("Maximum 5 test attachments allowed", 400);
  }

  for (const attachment of normalized) {
    if (attachment.sizeBytes <= 0) {
      throw withStatusCode(`Invalid attachment: ${attachment.name}`, 400);
    }
    if (attachment.sizeBytes > 3 * 1024 * 1024) {
      throw withStatusCode(`Attachment too large: ${attachment.name}`, 400);
    }
  }

  return normalized;
};

const requestGraphToken = async ({ tenantId, clientId, clientSecret, scope }) => {
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

export const sendMicrosoftGraphTestEmail = async ({ settings, to, subject, message, attachments }) => {
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

  if (!sender) {
    throw withStatusCode("Default sender is required before sending a test email", 400);
  }

  if (!isValidEmail(to)) {
    throw withStatusCode("Recipient email is invalid", 400);
  }

  if (!isValidEmail(sender)) {
    throw withStatusCode("Default sender email is invalid", 400);
  }

  const normalizedSubject = readString(subject, "MTI Email Blaster Test Message");
  const normalizedMessage = readString(
    message,
    "This is a test email sent from MTI Email Blaster settings page.",
  );
  const normalizedAttachments = sanitizeAttachments(attachments);
  const accessToken = await requestGraphToken({ tenantId, clientId, clientSecret, scope });
  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const mailPayload = {
    message: {
      subject: normalizedSubject,
      body: {
        contentType: "HTML",
        content: `<p>${normalizedMessage}</p>`,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to.trim(),
          },
        },
      ],
      attachments: normalizedAttachments.map((attachment) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: attachment.name,
        contentType: attachment.contentType,
        contentBytes: attachment.contentBytes,
      })),
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
    throw withStatusCode("Microsoft Graph rejected test email send request.", 400);
  }

  return {
    sender,
    recipient: to.trim(),
    subject: normalizedSubject,
  };
};
