import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { notificationsService } from "./notifications.service";

let schedulerStarted = false;
let schedulerHandle: NodeJS.Timeout | null = null;
let dispatchInFlight = false;

const runReminderDispatch = async (): Promise<void> => {
  if (dispatchInFlight) {
    return;
  }

  dispatchInFlight = true;

  try {
    const result = await notificationsService.processDueReminders({
      limit: env.REMINDER_DISPATCH_BATCH_SIZE,
    });

    if (result.processedCount > 0 || result.failedCount > 0) {
      logger.info("Reminder dispatcher run completed.", result);
    }
  } catch (error) {
    logger.error("Reminder dispatcher run failed.", error);
  } finally {
    dispatchInFlight = false;
  }
};

export const startReminderScheduler = (): void => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  if (!env.REMINDER_DISPATCH_ENABLED) {
    logger.info("Reminder scheduler is disabled.");
    return;
  }

  logger.info("Starting reminder scheduler.", {
    intervalMs: env.REMINDER_DISPATCH_INTERVAL_MS,
    batchSize: env.REMINDER_DISPATCH_BATCH_SIZE,
  });

  schedulerHandle = setInterval(() => {
    void runReminderDispatch();
  }, env.REMINDER_DISPATCH_INTERVAL_MS);

  void runReminderDispatch();
};

export const stopReminderScheduler = (): void => {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }

  schedulerStarted = false;
};
