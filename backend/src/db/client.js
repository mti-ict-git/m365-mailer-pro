import { createAppPool } from "./postgres.js";

let poolInstance = null;

const getPool = () => {
  if (!poolInstance) {
    poolInstance = createAppPool();
  }

  return poolInstance;
};

export const query = (text, params = []) => getPool().query(text, params);
