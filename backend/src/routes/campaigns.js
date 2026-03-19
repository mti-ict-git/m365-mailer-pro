import { Router } from "express";
import {
  createCampaign,
  getCampaignById,
  listCampaignLogs,
  listCampaigns,
} from "../services/campaign-store.js";

export const campaignRouter = Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parseCreatePayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  return {
    name: typeof body.name === "string" ? body.name : "",
    subject: typeof body.subject === "string" ? body.subject : "",
    sender: typeof body.sender === "string" ? body.sender : "",
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : "",
    recipients,
  };
};

campaignRouter.get("/", asyncHandler(async (req, res) => {
  const campaigns = await listCampaigns();
  res.status(200).json({ campaigns });
}));

campaignRouter.get("/:id", asyncHandler(async (req, res) => {
  const campaign = await getCampaignById(req.params.id);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }

  const logs = await listCampaignLogs(req.params.id);
  res.status(200).json({ campaign, logs });
}));

campaignRouter.post("/", asyncHandler(async (req, res) => {
  const payload = parseCreatePayload(req.body);
  const campaign = await createCampaign(payload);
  res.status(201).json({ campaign });
}));
