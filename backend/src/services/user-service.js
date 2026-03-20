import { query } from "../db/client.js";

const VALID_ROLES = ["admin", "manager", "user"];

export const findOrCreateUser = async (username) => {
  const normalizedUsername = username.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await query(
    `SELECT id, username, display_name, email, role FROM app_users WHERE username = $1`,
    [normalizedUsername],
  );

  if (existingUser.rows[0]) {
    // Update last access and return existing user
    await query(`UPDATE app_users SET updated_at = NOW() WHERE id = $1`, [existingUser.rows[0].id]);
    return existingUser.rows[0];
  }

  // New user - check if this is the first user (should be admin)
  const countResult = await query(`SELECT COUNT(*) as count FROM app_users`);
  const isFirstUser = parseInt(countResult.rows[0].count, 10) === 0;
  const role = isFirstUser ? "admin" : "user";

  const result = await query(
    `INSERT INTO app_users (username, display_name, role, source)
     VALUES ($1, $1, $2, 'header')
     RETURNING id, username, display_name, email, role`,
    [normalizedUsername, role],
  );

  return result.rows[0];
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
