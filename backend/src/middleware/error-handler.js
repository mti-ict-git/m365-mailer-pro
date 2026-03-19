export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Not found" });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Internal server error" : error.message;
  return res.status(statusCode).json({ message });
};
