import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { appDatabaseName, createAdminPool, createAppPool } from "./postgres.js";

const createDatabaseIfMissing = async () => {
  if (!env.postgresUrl || !appDatabaseName) {
    return;
  }
  if (!env.postgresCreateDatabase) {
    return;
  }

  const adminPool = createAdminPool();
  try {
    const result = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [appDatabaseName]);
    if (result.rowCount === 0) {
      const escapedName = appDatabaseName.replaceAll('"', '""');
      await adminPool.query(`CREATE DATABASE "${escapedName}"`);
    }
  } finally {
    await adminPool.end();
  }
};

const applySchema = async () => {
  if (!env.postgresUrl || !appDatabaseName) {
    return;
  }

  const schemaPath = path.join(env.sqlPath, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf-8");
  const appPool = createAppPool();

  try {
    await appPool.query(schemaSql);
  } finally {
    await appPool.end();
  }
};

export const ensureDatabaseReady = async () => {
  await createDatabaseIfMissing();
  await applySchema();
};
