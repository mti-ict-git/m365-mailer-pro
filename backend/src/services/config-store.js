import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { query } from "../db/client.js";

const readJsonFile = async (fileName) => {
  const absolutePath = path.join(env.dataPath, fileName);
  const raw = await fs.readFile(absolutePath, "utf-8");
  return JSON.parse(raw);
};

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const pickNumber = (preferred, fallback, hardDefault) => {
  const preferredValue = Number(preferred);
  if (Number.isFinite(preferredValue)) {
    return preferredValue;
  }

  const fallbackValue = Number(fallback);
  if (Number.isFinite(fallbackValue)) {
    return fallbackValue;
  }

  return hardDefault;
};

const pickString = (...values) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) || "";

const isRecoverableSettingsReadError = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const recoverableCodes = [
    "42P01",       // undefined_table
    "3D000",       // invalid_catalog_name (database does not exist)
    "28000",       // invalid_authorization_specification
    "28P01",       // invalid_password
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",   // DNS resolution failure
    "EAI_AGAIN",   // DNS temporary failure
  ];
  if (recoverableCodes.includes(code)) {
    return true;
  }

  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return message.includes("no pg_hba.conf entry")
    || message.includes("connection refused")
    || message.includes("password authentication failed")
    || message.includes("timeout")
    || message.includes("does not exist")
    || message.includes("ssl")
    || message.includes("the server does not support ssl");
};

const readPersistedSettings = async () => {
  try {
    const result = await query("SELECT settings FROM app_settings WHERE id = 1");
    if (result.rowCount === 0) {
      return {};
    }

    return asObject(result.rows[0].settings);
  } catch (error) {
    if (isRecoverableSettingsReadError(error)) {
      return {};
    }
    throw error;
  }
};

const sanitizeForClient = (settings) => {
  const application = asObject(settings.application);
  const mail = asObject(settings.mail);
  const graph = asObject(mail.microsoftGraph);

  const clientSecret = pickString(graph.clientSecret);
  const allowedSenders = Array.isArray(mail.allowedSenders) ? mail.allowedSenders : [];

  return {
    ...settings,
    application: {
      ...application,
      defaultBatchSize: pickNumber(application.defaultBatchSize, 50, 50),
      defaultBatchDelaySeconds: pickNumber(application.defaultBatchDelaySeconds, 2, 2),
    },
    mail: {
      ...mail,
      recipientWarningThreshold: pickNumber(mail.recipientWarningThreshold, 100, 100),
      allowedSenders,
      systemNotificationSender: pickString(mail.systemNotificationSender),
      microsoftGraph: {
        tenantId: pickString(graph.tenantId),
        clientId: pickString(graph.clientId),
        scope: pickString(graph.scope, "https://graph.microsoft.com/.default"),
        hasClientSecret: Boolean(clientSecret),
      },
    },
  };
};

const mergeAppSettings = ({ fileSettings, persistedSettings }) => {
  const fileRoot = asObject(fileSettings);
  const persistedRoot = asObject(persistedSettings);
  const fileApplication = asObject(fileRoot.application);
  const persistedApplication = asObject(persistedRoot.application);
  const fileMail = asObject(fileRoot.mail);
  const persistedMail = asObject(persistedRoot.mail);
  const fileGraph = asObject(fileMail.microsoftGraph);
  const persistedGraph = asObject(persistedMail.microsoftGraph);

  // For allowedSenders, persisted takes precedence; use file as fallback
  const allowedSenders = Array.isArray(persistedMail.allowedSenders)
    ? persistedMail.allowedSenders
    : Array.isArray(fileMail.allowedSenders)
      ? fileMail.allowedSenders
      : [];

  const merged = {
    ...fileRoot,
    ...persistedRoot,
    application: {
      ...fileApplication,
      ...persistedApplication,
      defaultBatchSize: pickNumber(
        persistedApplication.defaultBatchSize,
        fileApplication.defaultBatchSize,
        50,
      ),
      defaultBatchDelaySeconds: pickNumber(
        persistedApplication.defaultBatchDelaySeconds,
        fileApplication.defaultBatchDelaySeconds,
        2,
      ),
    },
    mail: {
      ...fileMail,
      ...persistedMail,
      defaultSender: pickString(persistedMail.defaultSender, fileMail.defaultSender),
      systemNotificationSender: pickString(persistedMail.systemNotificationSender, fileMail.systemNotificationSender),
      allowedSenders,
      recipientWarningThreshold: pickNumber(
        persistedMail.recipientWarningThreshold,
        fileMail.recipientWarningThreshold,
        100,
      ),
      microsoftGraph: {
        ...fileGraph,
        ...persistedGraph,
        tenantId: pickString(persistedGraph.tenantId, env.msGraphTenantId, fileGraph.tenantId),
        clientId: pickString(persistedGraph.clientId, env.msGraphClientId, fileGraph.clientId),
        scope: pickString(persistedGraph.scope, env.msGraphScope, fileGraph.scope, "https://graph.microsoft.com/.default"),
        clientSecret: pickString(persistedGraph.clientSecret, env.msGraphClientSecret, fileGraph.clientSecret),
      },
    },
  };

  return merged;
};

const buildSettingsToPersist = (settingsPatch, currentSettings) => {
  const currentRoot = asObject(currentSettings);
  const currentApplication = asObject(currentRoot.application);
  const currentMail = asObject(currentRoot.mail);
  const currentGraph = asObject(currentMail.microsoftGraph);
  const patchRoot = asObject(settingsPatch);
  const patchApplication = asObject(patchRoot.application);
  const patchMail = asObject(patchRoot.mail);
  const patchGraph = asObject(patchMail.microsoftGraph);
  const nextClientSecret = pickString(patchGraph.clientSecret, currentGraph.clientSecret);

  // For allowedSenders, use patch if provided (even if empty array), otherwise keep current
  const allowedSenders = Array.isArray(patchMail.allowedSenders)
    ? patchMail.allowedSenders
    : Array.isArray(currentMail.allowedSenders)
      ? currentMail.allowedSenders
      : [];

  return {
    application: {
      defaultBatchSize: pickNumber(
        patchApplication.defaultBatchSize,
        currentApplication.defaultBatchSize,
        50,
      ),
      defaultBatchDelaySeconds: pickNumber(
        patchApplication.defaultBatchDelaySeconds,
        currentApplication.defaultBatchDelaySeconds,
        2,
      ),
    },
    mail: {
      defaultSender: pickString(patchMail.defaultSender, currentMail.defaultSender),
      systemNotificationSender: pickString(patchMail.systemNotificationSender, currentMail.systemNotificationSender),
      allowedSenders,
      recipientWarningThreshold: pickNumber(
        patchMail.recipientWarningThreshold,
        currentMail.recipientWarningThreshold,
        100,
      ),
      microsoftGraph: {
        tenantId: pickString(patchGraph.tenantId, currentGraph.tenantId),
        clientId: pickString(patchGraph.clientId, currentGraph.clientId),
        scope: pickString(patchGraph.scope, currentGraph.scope, "https://graph.microsoft.com/.default"),
        clientSecret: nextClientSecret,
      },
    },
  };
};

export const loadAppSettings = async () => {
  const fileSettings = await readJsonFile("settings.json");
  const persistedSettings = await readPersistedSettings();
  const merged = mergeAppSettings({ fileSettings, persistedSettings });
  return sanitizeForClient(merged);
};

export const loadAppSettingsInternal = async () => {
  const fileSettings = await readJsonFile("settings.json");
  const persistedSettings = await readPersistedSettings();
  return mergeAppSettings({ fileSettings, persistedSettings });
};

export const loadLoginConfig = async () => {
  const fileSettings = await readJsonFile("settings.json");
  const ldap = asObject(fileSettings.ldap);
  const rawDomains = Array.isArray(ldap.domains) ? ldap.domains : [];
  const domains = rawDomains
    .map((domain) => {
      const row = domain && typeof domain === "object" ? domain : {};
      const id = pickString(row.id);
      const label = pickString(row.label, id);
      if (!id) {
        return null;
      }
      return { id, label };
    })
    .filter((domain) => domain !== null);

  return {
    ldap: {
      domains,
    },
  };
};

export const saveAppSettings = async (settingsPatch) => {
  const fileSettings = await readJsonFile("settings.json");
  const persistedSettings = await readPersistedSettings();
  const mergedCurrent = mergeAppSettings({ fileSettings, persistedSettings });
  const toPersist = buildSettingsToPersist(settingsPatch, mergedCurrent);

  await query(
    `INSERT INTO app_settings (id, settings, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
    [JSON.stringify(toPersist)],
  );

  const merged = mergeAppSettings({ fileSettings, persistedSettings: toPersist });
  return sanitizeForClient(merged);
};
export const loadTemplates = async () => readJsonFile("templates.json");
