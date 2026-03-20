export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.userContext?.role || !allowedRoles.includes(req.userContext.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  return next();
};

export const requireAdmin = requireRole(["admin"]);
export const requireManagerOrAdmin = requireRole(["admin", "manager"]);
