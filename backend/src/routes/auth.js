import { Router } from "express";
import { authenticateWithLdap } from "../services/ldap-auth.js";
import { validateLoginPayload } from "../middleware/validate-login.js";
import { loadAppSettings, loadTemplates } from "../services/config-store.js";

export const authRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

authRouter.post("/login", validateLoginPayload, asyncHandler(async (req, res) => {
  const { username, password, domain } = req.loginPayload;
  const user = await authenticateWithLdap({ username, password });
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
}));

authRouter.get("/settings", asyncHandler(async (req, res) => {
  const settings = await loadAppSettings();
  res.status(200).json(settings);
}));

authRouter.get("/templates", asyncHandler(async (req, res) => {
  const templates = await loadTemplates();
  res.status(200).json(templates);
}));
