import { query } from "../db/client.js";

export const findOrCreateUser = async (username) => {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await query(
    `INSERT INTO app_users (username, display_name, source)
     VALUES ($1, $1, 'header')
     ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
     RETURNING id, username, display_name, email`,
    [normalizedUsername],
  );

  return result.rows[0];
};

export const findUserByUsername = async (username) => {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await query(
    `SELECT id, username, display_name, email FROM app_users WHERE username = $1`,
    [normalizedUsername],
  );

  return result.rows[0] || null;
};
