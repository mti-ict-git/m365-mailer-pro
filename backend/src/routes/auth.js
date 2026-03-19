import { Router } from "express";
import { authenticateWithLdap } from "../services/ldap-auth.js";
import { validateLoginPayload } from "../middleware/validate-login.js";
import { loadAppSettings, loadTemplates } from "../services/config-store.js";
import { writeLoginAudit } from "../services/login-audit.js";

export const authRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

authRouter.post("/login", validateLoginPayload, asyncHandler(async (req, res) => {
  const { username, password, domain } = req.loginPayload;
  const sourceIp = req.ip || req.socket.remoteAddress || "";

  try {
    const user = await authenticateWithLdap({ username, password });
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
    await writeLoginAudit({
      username,
      domain,
      success: false,
      sourceIp,
      errorMessage: message,
    }).catch(() => undefined);
    throw error;
  }
}));

authRouter.get("/settings", asyncHandler(async (req, res) => {
  const settings = await loadAppSettings();
  res.status(200).json(settings);
}));

authRouter.get("/templates", asyncHandler(async (req, res) => {
  const templates = await loadTemplates();
  res.status(200).json(templates);
}));
