import { query } from "../db/client.js";

export const writeLoginAudit = async ({ username, domain, success, sourceIp, errorMessage }) => {
  await query(
    `INSERT INTO login_audits (username, domain, success, source_ip, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [username, domain, success, sourceIp, errorMessage || null],
  );
};
