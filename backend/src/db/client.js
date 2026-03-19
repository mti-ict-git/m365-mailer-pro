import { createAppPool } from "./postgres.js";

let poolInstance = null;

const getPool = () => {
  if (!poolInstance) {
    poolInstance = createAppPool();
  }

  return poolInstance;
};

export const query = (text, params = []) => getPool().query(text, params);

export const withTransaction = async (handler) => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runner = (text, params = []) => client.query(text, params);
    const result = await handler(runner);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
