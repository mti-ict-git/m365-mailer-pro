import { query } from "../db/client.js";

const VALID_ROLES = ["admin", "manager", "user", "pending"];

export const findOrCreateUser = async ({ username, displayName, email }) => {
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const resolvedDisplayName = displayName || normalizedUsername;

  // Check if user already exists
  const existingUser = await query(
    `SELECT id, username, display_name, email, role FROM app_users WHERE username = $1`,
    [normalizedUsername],
  );

  if (existingUser.rows[0]) {
    const user = existingUser.rows[0];
    // Update last access and backfill email/display_name if currently NULL
    const updates = [];
    const values = [user.id];
    let paramIndex = 2;

    if (!user.email && normalizedEmail) {
      updates.push(`email = $${paramIndex++}`);
      values.push(normalizedEmail);
    }
    if (user.display_name === user.username && resolvedDisplayName !== user.username) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(resolvedDisplayName);
    }

    const updateClause = updates.length > 0 ? `, ${updates.join(", ")}` : "";
    await query(
      `UPDATE app_users SET updated_at = NOW()${updateClause} WHERE id = $1
       RETURNING id, username, display_name, email, role`,
      values,
    );

    // Re-fetch to get updated values
    const refreshed = await query(
      `SELECT id, username, display_name, email, role FROM app_users WHERE id = $1`,
      [user.id],
    );
    return { ...refreshed.rows[0], isNewUser: false };
  }

  // New user - check if this is the first user (should be admin)
  const countResult = await query(`SELECT COUNT(*) as count FROM app_users`);
  const isFirstUser = parseInt(countResult.rows[0].count, 10) === 0;
  const role = isFirstUser ? "admin" : "pending";

  const result = await query(
    `INSERT INTO app_users (username, display_name, email, role, source)
     VALUES ($1, $2, $3, $4, 'ldap')
     RETURNING id, username, display_name, email, role`,
    [normalizedUsername, resolvedDisplayName, normalizedEmail, role],
  );

  return { ...result.rows[0], isNewUser: true };
};

export const findUserByUsername = async (username) => {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await query(
    `SELECT id, username, display_name, email, role FROM app_users WHERE username = $1`,
    [normalizedUsername],
  );

  return result.rows[0] || null;
};

export const listAllUsers = async () => {
  const result = await query(
    `SELECT id, username, display_name, email, role, created_at
     FROM app_users
     ORDER BY created_at ASC`,
  );

  return result.rows;
};

export const updateUserRole = async (userId, newRole) => {
  if (!VALID_ROLES.includes(newRole)) {
    const error = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `UPDATE app_users
     SET role = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, display_name, email, role`,
    [userId, newRole],
  );

  return result.rows[0] || null;
};

export const deleteUser = async (userId) => {
  const result = await query(`DELETE FROM app_users WHERE id = $1`, [userId]);
  return result.rowCount > 0;
};

export const getAdminEmails = async () => {
  const result = await query(
    `SELECT email FROM app_users WHERE role = 'admin' AND email IS NOT NULL AND email != ''`,
  );
  return result.rows.map((row) => row.email);
};
