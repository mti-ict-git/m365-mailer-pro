import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

const readJsonFile = async (fileName) => {
  const absolutePath = path.join(env.dataPath, fileName);
  const raw = await fs.readFile(absolutePath, "utf-8");
  return JSON.parse(raw);
};

export const loadAppSettings = async () => readJsonFile("settings.json");
export const loadTemplates = async () => readJsonFile("templates.json");
