import { Router } from "express";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  listCampaignLogs,
  listCampaignRecipients,
  listCampaigns,
  updateCampaign,
} from "../services/campaign-store.js";
import { dispatchCampaign } from "../services/campaign-dispatcher.js";
import { userContextMiddleware } from "../middleware/user-context.js";
import { requireApprovedUser } from "../middleware/role-guard.js";

export const campaignRouter = Router();

// Apply user context to all routes, then require approved (non-pending) user
campaignRouter.use(userContextMiddleware);
campaignRouter.use(requireApprovedUser);

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parseCreatePayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  return {
    name: typeof body.name === "string" ? body.name : "",
    subject: typeof body.subject === "string" ? body.subject : "",
    sender: typeof body.sender === "string" ? body.sender : "",
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : "",
    recipients,
    attachments,
  };
};

const parseUpdatePayload = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const hasAttachments = Object.prototype.hasOwnProperty.call(body, "attachments");
  const attachments = hasAttachments && Array.isArray(body.attachments) ? body.attachments : undefined;

  return {
    name: typeof body.name === "string" ? body.name : undefined,
    subject: typeof body.subject === "string" ? body.subject : undefined,
    sender: typeof body.sender === "string" ? body.sender : undefined,
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : undefined,
    recipients,
    attachments,
  };
};

campaignRouter.get("/", asyncHandler(async (req, res) => {
  const campaigns = await listCampaigns(req.userContext.userId, req.userContext.role);
  res.status(200).json({ campaigns });
}));

campaignRouter.get("/:id", asyncHandler(async (req, res) => {
  const campaign = await getCampaignById(req.params.id, req.userContext.userId, req.userContext.role);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }

  const logs = await listCampaignLogs(req.params.id, req.userContext.userId, req.userContext.role);
  const recipients = await listCampaignRecipients(req.params.id, req.userContext.userId, req.userContext.role);
  res.status(200).json({ campaign, logs, recipients });
}));

campaignRouter.post("/", asyncHandler(async (req, res) => {
  const payload = parseCreatePayload(req.body);
  const campaign = await createCampaign(payload, req.userContext.userId);
  void dispatchCampaign(campaign.id);
  res.status(201).json({ campaign });
}));

campaignRouter.post("/:id/dispatch", asyncHandler(async (req, res) => {
  const campaign = await getCampaignById(req.params.id, req.userContext.userId, req.userContext.role);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  void dispatchCampaign(req.params.id);
  res.status(202).json({ message: "Campaign dispatch started" });
}));

campaignRouter.put("/:id", asyncHandler(async (req, res) => {
  const payload = parseUpdatePayload(req.body);
  const campaign = await updateCampaign(req.params.id, payload, req.userContext.userId, req.userContext.role);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  void dispatchCampaign(campaign.id);
  res.status(200).json({ campaign });
}));

campaignRouter.delete("/:id", asyncHandler(async (req, res) => {
  const isDeleted = await deleteCampaign(req.params.id, req.userContext.userId, req.userContext.role);
  if (!isDeleted) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  res.status(204).send();
}));
