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

const searchUser = async (client, samAccountName) => {
  const filter = `(&(objectClass=user)(sAMAccountName=${escapeLdapFilter(samAccountName)}))`;
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

const createClient = () =>
  new Client({
    url: env.ldapUrl,
    timeout: 10000,
    connectTimeout: 10000,
    tlsOptions: {
      rejectUnauthorized: env.ldapTlsRejectUnauthorized,
    },
  });

const readValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  return value ? String(value) : "";
};

const withStatusCode = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const authenticateWithLdap = async ({ username, password }) => {
  if (!env.ldapUrl || !env.ldapBaseDn || !env.ldapBindDn || !env.ldapBindPassword) {
    throw withStatusCode("LDAP service is not configured", 503);
  }

  const samAccountName = normalizeSamAccountName(username);
  const serviceClient = createClient();

  try {
    await serviceClient.bind(env.ldapBindDn, env.ldapBindPassword);
    const entry = await searchUser(serviceClient, samAccountName);
    const userDn = readValue(entry.dn);

    const userClient = createClient();
    try {
      await userClient.bind(userDn, password);
    } finally {
      await userClient.unbind().catch(() => undefined);
    }

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
    if (message.toLowerCase().includes("invalid credentials")) {
      throw withStatusCode("Invalid credentials", 401);
    }
    throw withStatusCode("Authentication failed", 401);
  } finally {
    await serviceClient.unbind().catch(() => undefined);
  }
};
