import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(
  cors({
    origin: env.corsOrigin.split(",").map((value) => value.trim()),
    credentials: false,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "m365-mailer-pro-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);
