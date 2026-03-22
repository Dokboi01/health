import { app } from "./app";
import { pool } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

const bootstrap = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");

    app.listen(env.PORT, () => {
      logger.info(`CareAxis API listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to bootstrap API.", error);
    process.exit(1);
  }
};

void bootstrap();
