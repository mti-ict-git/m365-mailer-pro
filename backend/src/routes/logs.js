import { Router } from "express";
import { listLogs } from "../services/campaign-store.js";

export const logRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

logRouter.get("/", asyncHandler(async (req, res) => {
  const logs = await listLogs();
  res.status(200).json({ logs });
}));
