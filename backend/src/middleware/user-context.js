import { findOrCreateUser } from "../services/user-service.js";
import { normalizeSamAccountName } from "../utils/normalize-username.js";

export const userContextMiddleware = async (req, res, next) => {
  const headerValue = req.headers["x-username"];
  const username = normalizeSamAccountName(
    typeof headerValue === "string" ? headerValue : "",
  );

  if (!username) {
    return res.status(401).json({ message: "X-Username header is required" });
  }

  try {
    const user = await findOrCreateUser(username);
    req.userContext = {
      userId: user.id,
      username: user.username,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
