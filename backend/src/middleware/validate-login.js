import { normalizeSamAccountName } from "../utils/normalize-username.js";

export const validateLoginPayload = (req, res, next) => {
  const usernameInput = typeof req.body?.username === "string" ? req.body.username : "";
  const passwordInput = typeof req.body?.password === "string" ? req.body.password : "";
  const domainInput = typeof req.body?.domain === "string" ? req.body.domain : "";

  const username = normalizeSamAccountName(usernameInput);
  const password = passwordInput.trim();
  const domain = domainInput.trim();

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  req.loginPayload = { username, password, domain };
  return next();
};
