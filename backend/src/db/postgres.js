import { Pool } from "pg";
import { env } from "../config/env.js";

const buildConnectionString = (databaseName) => {
  if (!env.postgresUrl) {
    return "";
  }

  const parsed = new URL(env.postgresUrl);
  if (env.postgresUsername) {
    parsed.username = encodeURIComponent(env.postgresUsername);
  }
  if (env.postgresPassword) {
    parsed.password = encodeURIComponent(env.postgresPassword);
  }
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
};

const resolveDatabaseName = () => {
  if (env.postgresDatabase) {
    return env.postgresDatabase;
  }

  if (!env.postgresUrl) {
    return "";
  }

  const parsed = new URL(env.postgresUrl);
  const pathName = parsed.pathname.replace("/", "").trim();
  return pathName || "postgres";
};

const resolveAdminDatabase = () => {
  if (!env.postgresUrl) {
    return "";
  }

  const parsed = new URL(env.postgresUrl);
  const pathName = parsed.pathname.replace("/", "").trim();
  return pathName || "postgres";
};

export const appDatabaseName = resolveDatabaseName();
const adminDatabaseName = resolveAdminDatabase();

const shouldUseSslByDefault = () => {
  if (!env.postgresUrl) {
    return false;
  }

  const parsed = new URL(env.postgresUrl);
  const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  return !isLocalHost;
};

const resolveSslEnabled = () => {
  const raw = typeof env.postgresSslRaw === "string" ? env.postgresSslRaw.trim().toLowerCase() : "";
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return shouldUseSslByDefault();
};

const sslEnabled = resolveSslEnabled();

const buildPoolOptions = (connectionString) => ({
  connectionString,
  ssl: sslEnabled
    ? {
        rejectUnauthorized: env.postgresSslRejectUnauthorized,
      }
    : undefined,
});

export const createAdminPool = () =>
  new Pool(buildPoolOptions(buildConnectionString(adminDatabaseName)));

export const createAppPool = () =>
  new Pool(buildPoolOptions(buildConnectionString(appDatabaseName)));
