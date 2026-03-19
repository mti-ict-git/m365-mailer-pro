import { Pool } from "pg";
import { env } from "../config/env.js";

const buildConnectionString = (databaseName) => {
  if (!env.postgresUrl) {
    return "";
  }

  const parsed = new URL(env.postgresUrl);
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

export const appDatabaseName = resolveDatabaseName();

export const createAdminPool = () =>
  new Pool({
    connectionString: env.postgresUrl,
  });

export const createAppPool = () =>
  new Pool({
    connectionString: buildConnectionString(appDatabaseName),
  });
