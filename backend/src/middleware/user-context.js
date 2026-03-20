import { findUserByUsername } from "../services/user-service.js";
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
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "User not found. Please login first." });
    }
    req.userContext = {
      userId: user.id,
      username: user.username,
      email: user.email || "",
      role: user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
