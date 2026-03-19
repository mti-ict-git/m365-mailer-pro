import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "../../../");

dotenv.config({ path: path.join(rootPath, ".env") });

const read = (name, fallback = "") => process.env[name] ?? fallback;

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: read("NODE_ENV", "development"),
  port: parsePort(read("BACKEND_PORT", "3001"), 3001),
  runDbInitOnStartup: read("RUN_DB_INIT_ON_STARTUP", "false") === "true",
  corsOrigin: read("CORS_ORIGIN", "http://localhost:8080"),
  ldapUrl: read("LDAP_URL"),
  ldapBaseDn: read("LDAP_BASE_DN"),
  ldapBindDn: read("BIND_DN", read("LDAP_USERNAME")),
  ldapBindPassword: read("BIND_PW", read("LDAP_PASSWORD")),
  ldapTlsRejectUnauthorized: read("LDAP_TLS_REJECT_UNAUTHORIZED", "true") === "true",
  msGraphClientId: read("MS_GRAPH_CLIENT_ID"),
  msGraphTenantId: read("MS_GRAPH_TENANT_ID"),
  msGraphClientSecret: read("MS_GRAPH_CLIENT_SECRET"),
  msGraphScope: read("MS_GRAPH_SCOPE", "https://graph.microsoft.com/.default"),
  postgresUrl: read("POSTGRES_URL"),
  postgresUsername: read("POSTGRES_USERNAME"),
  postgresPassword: read("POSTGRES_PASSWORD"),
  postgresDatabase: read("POSTGRES_DATABASE", "emailBlasterDB"),
  postgresCreateDatabase: read("POSTGRES_CREATE_DATABASE", "true") === "true",
  postgresSslRaw: read("POSTGRES_SSL", ""),
  postgresSsl: read("POSTGRES_SSL", "") === "true",
  postgresSslRejectUnauthorized: read("POSTGRES_SSL_REJECT_UNAUTHORIZED", "false") === "true",
  dataPath: path.join(rootPath, "data"),
  sqlPath: path.join(rootPath, "backend/sql"),
};
