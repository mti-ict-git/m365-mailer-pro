import { Client } from "ldapts";
import { env } from "../config/env.js";
import { normalizeSamAccountName } from "../utils/normalize-username.js";

const userAttributes = [
  "distinguishedName",
  "displayName",
  "mail",
  "sAMAccountName",
  "department",
  "title",
];

const escapeLdapFilter = (value) =>
  value
    .replaceAll("\\", "\\5c")
    .replaceAll("*", "\\2a")
    .replaceAll("(", "\\28")
    .replaceAll(")", "\\29")
    .replaceAll("\u0000", "\\00");

const createClient = ({ url, rejectUnauthorized }) =>
  new Client({
    url,
    timeout: 10000,
    connectTimeout: 10000,
    tlsOptions: {
      rejectUnauthorized,
    },
  });

const readValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  return value ? String(value) : "";
};

const withStatusCode = (message, statusCode, auditMessage = "") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.auditMessage = auditMessage || message;
  return error;
};

const isConnectionIssue = (message) =>
  message.includes("ECONNREFUSED")
  || message.includes("ETIMEDOUT")
  || message.includes("connect timeout")
  || message.includes("socket")
  || message.includes("ECONNRESET")
  || message.includes("unable to verify the first certificate")
  || message.includes("self-signed certificate");

const resolveClientConfigs = () => {
  if (!env.ldapUrl) {
    return [];
  }

  const urls = [env.ldapUrl];
  if (env.ldapUrl.startsWith("ldap://")) {
    const fallback = new URL(env.ldapUrl);
    fallback.protocol = "ldaps:";
    fallback.port = "636";
    urls.push(fallback.toString());
  }

  const uniqueUrls = urls.filter((value, index, all) => all.indexOf(value) === index);
  const configs = uniqueUrls.flatMap((url) => {
    const baseConfig = [{ url, rejectUnauthorized: env.ldapTlsRejectUnauthorized }];
    if (url.startsWith("ldaps://") && env.ldapTlsRejectUnauthorized) {
      baseConfig.push({ url, rejectUnauthorized: false });
    }
    return baseConfig;
  });

  return configs.filter((value, index, all) =>
    all.findIndex((entry) =>
      entry.url === value.url && entry.rejectUnauthorized === value.rejectUnauthorized) === index);
};

const buildCandidateValues = ({ username, domain }) => {
  const normalized = normalizeSamAccountName(username);
  const userPrincipalName = username.includes("@") ? username.trim() : "";
  const domainPrincipalName = domain ? `${normalized}@${domain}` : "";

  return [normalized, userPrincipalName, domainPrincipalName].filter((value, index, all) =>
    Boolean(value) && all.indexOf(value) === index);
};

const searchUser = async (client, candidates) => {
  const escapedSam = escapeLdapFilter(candidates[0] || "");
  const escapedUpn = escapeLdapFilter(candidates[1] || "");
  const escapedDomainUpn = escapeLdapFilter(candidates[2] || "");
  const filterParts = [
    `(sAMAccountName=${escapedSam})`,
    escapedUpn ? `(userPrincipalName=${escapedUpn})` : "",
    escapedDomainUpn ? `(userPrincipalName=${escapedDomainUpn})` : "",
  ].filter(Boolean);

  const filter = `(&(objectClass=user)(|${filterParts.join("")}))`;
  const result = await client.search(env.ldapBaseDn, {
    scope: "sub",
    filter,
    attributes: userAttributes,
    sizeLimit: 1,
  });

  const entry = result.searchEntries[0];
  if (!entry) {
    throw new Error("Invalid credentials");
  }

  return entry;
};

const bindUser = async ({ userDn, password, candidates, clientConfig }) => {
  const bindTargets = [userDn, ...candidates.filter((value) => value.includes("@"))];
  const distinctTargets = bindTargets.filter((value, index, all) =>
    Boolean(value) && all.indexOf(value) === index);

  for (const bindTarget of distinctTargets) {
    const userClient = createClient(clientConfig);
    try {
      await userClient.bind(bindTarget, password);
      return;
    } catch {
      await userClient.unbind().catch(() => undefined);
    }
  }

  throw new Error("Invalid credentials");
};

export const authenticateWithLdap = async ({ username, password, domain = "" }) => {
  if (!env.ldapUrl || !env.ldapBaseDn || !env.ldapBindDn || !env.ldapBindPassword) {
    throw withStatusCode("LDAP service is not configured", 503);
  }

  const samAccountName = normalizeSamAccountName(username);
  const candidates = buildCandidateValues({ username, domain });
  const clientConfigs = resolveClientConfigs();
  let lastErrorMessage = "Authentication failed";

  for (const clientConfig of clientConfigs) {
    const serviceClient = createClient(clientConfig);
    try {
      await serviceClient.bind(env.ldapBindDn, env.ldapBindPassword);
      const entry = await searchUser(serviceClient, candidates);
      const userDn = readValue(entry.dn) || readValue(entry.distinguishedName);
      await bindUser({ userDn, password, candidates, clientConfig });

      return {
        username: readValue(entry.sAMAccountName) || samAccountName,
        displayName: readValue(entry.displayName) || samAccountName,
        email: readValue(entry.mail),
        distinguishedName: userDn,
        department: readValue(entry.department),
        title: readValue(entry.title),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      const lower = message.toLowerCase();
      lastErrorMessage = message;

      if (
        lower.includes("invalid credentials")
        || lower.includes("data 52e")
        || lower.includes("acceptsecuritycontext")
        || lower.includes("ldap code 49")
      ) {
        throw withStatusCode("Invalid credentials", 401, message);
      }

      if (!isConnectionIssue(message)) {
        throw withStatusCode("Authentication failed", 401, message);
      }
    } finally {
      await serviceClient.unbind().catch(() => undefined);
    }
  }

  throw withStatusCode("LDAP service unavailable", 503, lastErrorMessage);
};
