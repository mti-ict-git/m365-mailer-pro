import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabaseReady } from "./db/init-database.js";

const start = async () => {
  if (env.runDbInitOnStartup) {
    await ensureDatabaseReady();
  }

  app.listen(env.port, () => {
    process.stdout.write(`Backend listening on http://localhost:${env.port}\n`);
  });
};

start().catch((error) => {
  const message = error instanceof Error ? error.message : "Startup failed";
  process.stderr.write(`Backend startup failed: ${message}\n`);
  process.exit(1);
});
