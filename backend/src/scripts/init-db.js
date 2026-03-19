import { ensureDatabaseReady } from "../db/init-database.js";

const run = async () => {
  await ensureDatabaseReady();
  process.stdout.write("Database is ready.\n");
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Database initialization failed";
  process.stderr.write(`Database initialization failed: ${message}\n`);
  process.exit(1);
});
