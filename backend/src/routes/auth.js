import { Router } from "express";
import { authenticateWithLdap } from "../services/ldap-auth.js";
import { validateLoginPayload } from "../middleware/validate-login.js";
import { loadAppSettings, loadAppSettingsInternal, loadTemplates, saveAppSettings } from "../services/config-store.js";
import { writeLoginAudit } from "../services/login-audit.js";
import { sendMicrosoftGraphTestEmail } from "../services/test-email.js";

export const authRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parseNumberInput = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseSettingsPayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const application = body.application && typeof body.application === "object"
    ? body.application
    : {};
  const mail = body.mail && typeof body.mail === "object" ? body.mail : {};
  const graph = mail.microsoftGraph && typeof mail.microsoftGraph === "object"
    ? mail.microsoftGraph
    : {};

  const defaultSender = typeof mail.defaultSender === "string" ? mail.defaultSender.trim() : "";
  const tenantId = typeof graph.tenantId === "string" ? graph.tenantId.trim() : "";
  const clientId = typeof graph.clientId === "string" ? graph.clientId.trim() : "";
  const scope = typeof graph.scope === "string" && graph.scope.trim()
    ? graph.scope.trim()
    : "https://graph.microsoft.com/.default";
  const clientSecret = typeof graph.clientSecret === "string" ? graph.clientSecret.trim() : "";

  return {
    application: {
      defaultBatchSize: parseNumberInput(application.defaultBatchSize, 50),
      defaultBatchDelaySeconds: parseNumberInput(application.defaultBatchDelaySeconds, 2),
    },
    mail: {
      defaultSender,
      recipientWarningThreshold: parseNumberInput(mail.recipientWarningThreshold, 100),
      microsoftGraph: {
        tenantId,
        clientId,
        scope,
        clientSecret,
      },
    },
  };
};

const parseTestEmailPayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  return {
    to,
    subject,
    message,
  };
};

authRouter.post("/login", validateLoginPayload, asyncHandler(async (req, res) => {
  const { username, password, domain } = req.loginPayload;
  const sourceIp = req.ip || req.socket.remoteAddress || "";

  try {
    const user = await authenticateWithLdap({ username, password, domain });
    await writeLoginAudit({
      username,
      domain,
      success: true,
      sourceIp,
      errorMessage: "",
    });

    res.status(200).json({
      user: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        domain,
        department: user.department,
        title: user.title,
        distinguishedName: user.distinguishedName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    const auditMessage = typeof error === "object" && error && "auditMessage" in error
      ? String(error.auditMessage)
      : message;
    await writeLoginAudit({
      username,
      domain,
      success: false,
      sourceIp,
      errorMessage: auditMessage,
    }).catch(() => undefined);
    throw error;
  }
}));

authRouter.get("/settings", asyncHandler(async (req, res) => {
  const settings = await loadAppSettings();
  res.status(200).json(settings);
}));

authRouter.post("/settings", asyncHandler(async (req, res) => {
  const payload = parseSettingsPayload(req.body);
  const settings = await saveAppSettings(payload);
  res.status(200).json(settings);
}));

authRouter.post("/settings/test-email", asyncHandler(async (req, res) => {
  const payload = parseTestEmailPayload(req.body);
  const settings = await loadAppSettingsInternal();
  const result = await sendMicrosoftGraphTestEmail({
    settings,
    to: payload.to,
    subject: payload.subject,
    message: payload.message,
  });
  res.status(200).json({
    message: "Test email sent",
    sender: result.sender,
    recipient: result.recipient,
    subject: result.subject,
  });
}));

authRouter.get("/templates", asyncHandler(async (req, res) => {
  const templates = await loadTemplates();
  res.status(200).json(templates);
}));
