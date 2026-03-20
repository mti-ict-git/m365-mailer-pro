import { Router } from "express";
import { authenticateWithLdap } from "../services/ldap-auth.js";
import { validateLoginPayload } from "../middleware/validate-login.js";
import { loadAppSettings, loadAppSettingsInternal, loadLoginConfig, loadTemplates, saveAppSettings } from "../services/config-store.js";
import { writeLoginAudit } from "../services/login-audit.js";
import { sendMicrosoftGraphTestEmail } from "../services/test-email.js";
import { findOrCreateUser, listAllUsers, updateUserRole, deleteUser, getAdminEmails } from "../services/user-service.js";
import { sendAccessRequestNotification } from "../services/notification-service.js";
import { userContextMiddleware } from "../middleware/user-context.js";
import { requireAdmin, requireManagerOrAdmin } from "../middleware/role-guard.js";
import { ensureDatabaseReady } from "../db/init-database.js";

export const authRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const withStatusCode = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const shouldRetryUserLookup = (error) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "42P01" || code === "3D000") {
    return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("relation")
    || message.includes("does not exist")
    || message.includes("app_users");
};

const parseNumberInput = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseAllowedSenders = (rawSenders) => {
  if (!Array.isArray(rawSenders)) {
    return undefined; // Not provided, keep current
  }
  return rawSenders
    .filter((sender) => typeof sender === "string" && emailRegex.test(sender.trim()))
    .map((sender) => sender.trim().toLowerCase())
    .filter((sender, index, arr) => arr.indexOf(sender) === index); // Remove duplicates
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
  const systemNotificationSender = typeof mail.systemNotificationSender === "string" ? mail.systemNotificationSender.trim() : "";
  const allowedSenders = parseAllowedSenders(mail.allowedSenders);
  const tenantId = typeof graph.tenantId === "string" ? graph.tenantId.trim() : "";
  const clientId = typeof graph.clientId === "string" ? graph.clientId.trim() : "";
  const scope = typeof graph.scope === "string" && graph.scope.trim()
    ? graph.scope.trim()
    : "https://graph.microsoft.com/.default";
  const clientSecret = typeof graph.clientSecret === "string" ? graph.clientSecret.trim() : "";

  const result = {
    application: {
      defaultBatchSize: parseNumberInput(application.defaultBatchSize, 50),
      defaultBatchDelaySeconds: parseNumberInput(application.defaultBatchDelaySeconds, 2),
    },
    mail: {
      defaultSender,
      systemNotificationSender,
      recipientWarningThreshold: parseNumberInput(mail.recipientWarningThreshold, 100),
      microsoftGraph: {
        tenantId,
        clientId,
        scope,
        clientSecret,
      },
    },
  };

  // Only include allowedSenders if it was provided in the payload
  if (allowedSenders !== undefined) {
    result.mail.allowedSenders = allowedSenders;
  }

  return result;
};

const parseTestEmailPayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  return {
    to,
    subject,
    message,
    attachments,
  };
};

authRouter.post("/login", validateLoginPayload, asyncHandler(async (req, res) => {
  const { username, password, domain } = req.loginPayload;
  const sourceIp = req.ip || req.socket.remoteAddress || "";

  try {
    const ldapUser = await authenticateWithLdap({ username, password, domain });
    let dbUser;

    try {
      dbUser = await findOrCreateUser({
        username: ldapUser.username,
        displayName: ldapUser.displayName,
        email: ldapUser.email,
      });
    } catch (error) {
      if (shouldRetryUserLookup(error)) {
        await ensureDatabaseReady();
        dbUser = await findOrCreateUser({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
        });
      } else {
        throw withStatusCode("User database is temporarily unavailable", 503);
      }
    }

    await writeLoginAudit({
      username,
      domain,
      success: true,
      sourceIp,
      errorMessage: "",
    }).catch(() => undefined);

    // Send notification to admins if this is a new pending user
    if (dbUser.isNewUser && dbUser.role === "pending") {
      getAdminEmails()
        .then((adminEmails) => {
          if (adminEmails.length > 0) {
            return sendAccessRequestNotification({
              newUser: {
                username: ldapUser.username,
                displayName: ldapUser.displayName,
                email: ldapUser.email,
              },
              adminEmails,
            });
          }
        })
        .catch((err) => {
          console.error("[auth] Failed to send access request notification:", err);
        });
    }

    res.status(200).json({
      user: {
        username: ldapUser.username,
        displayName: ldapUser.displayName,
        email: ldapUser.email,
        domain,
        department: ldapUser.department,
        title: ldapUser.title,
        distinguishedName: ldapUser.distinguishedName,
        role: dbUser.role,
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

authRouter.get("/login-config", asyncHandler(async (req, res) => {
  const config = await loadLoginConfig();
  res.status(200).json(config);
}));

authRouter.get("/settings", userContextMiddleware, requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const settings = await loadAppSettings();
  res.status(200).json(settings);
}));

authRouter.post("/settings", userContextMiddleware, requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const payload = parseSettingsPayload(req.body);
  const settings = await saveAppSettings(payload);
  res.status(200).json(settings);
}));

authRouter.post("/settings/test-email", userContextMiddleware, requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const payload = parseTestEmailPayload(req.body);
  const settings = await loadAppSettingsInternal();
  const result = await sendMicrosoftGraphTestEmail({
    settings,
    to: payload.to,
    subject: payload.subject,
    message: payload.message,
    attachments: payload.attachments,
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

// User management endpoints (admin only)
authRouter.get("/users", userContextMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const users = await listAllUsers();
  res.status(200).json({ users });
}));

authRouter.put("/users/:id/role", userContextMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Prevent admin from changing their own role
  if (id === req.userContext.userId) {
    return res.status(400).json({ message: "Cannot change your own role" });
  }

  const user = await updateUserRole(id, role);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ user });
}));

authRouter.delete("/users/:id", userContextMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.userContext.userId) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }

  const deleted = await deleteUser(id);
  if (!deleted) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(204).send();
}));
