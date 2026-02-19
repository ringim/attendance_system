import cron from 'node-cron';
import syncService from '../services/sync.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { testConnection, closeConnection } from '../database/index.js';

/**
 * Background Sync Worker
 * Periodically syncs attendance data from all active devices
 */

let syncJob = null;
let isShuttingDown = false;

/**
 * Initialize worker
 */
const initWorker = async () => {
  try {
    logger.info('Initializing sync worker...');

    // Test database connection
    await testConnection();

    if (!config.worker.enableAutoSync) {
      logger.info('Auto-sync is disabled. Worker will not start automatic syncing.');
      return;
    }

    // Calculate cron schedule (every X minutes)
    const syncInterval = config.device.syncInterval;
    const cronSchedule = `*/${syncInterval} * * * *`; // Every X minutes

    logger.info(`Setting up sync job to run every ${syncInterval} minutes`);

    // Create cron job
    syncJob = cron.schedule(cronSchedule, async () => {
      if (isShuttingDown) {
        logger.warn('Worker is shutting down, skipping sync...');
        return;
      }

      try {
        logger.info('Starting scheduled sync...');
        const result = await syncService.syncAllDevices();
        
        logger.info('Scheduled sync completed:', {
          totalDevices: result.totalDevices,
          successful: result.successfulSyncs,
          failed: result.failedSyncs,
          recordsInserted: result.totalRecordsInserted,
        });

        if (result.errors && result.errors.length > 0) {
          logger.error('Sync errors:', result.errors);
        }
      } catch (error) {
        logger.error('Error in scheduled sync:', error);
      }
    });

    logger.info('Sync worker initialized successfully');

    // Run initial sync
    logger.info('Running initial sync...');
    await syncService.syncAllDevices();

  } catch (error) {
    logger.error('Failed to initialize sync worker:', error);
    throw error;
  }
};

/**
 * Shutdown worker gracefully
 */
const shutdownWorker = async () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info('Shutting down sync worker...');

  try {
    // Stop cron job
    if (syncJob) {
      syncJob.stop();
      logger.info('Cron job stopped');
    }

    // Wait for any ongoing sync to complete
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (syncService.getSyncStatus().isRunning && attempts < maxAttempts) {
      logger.info('Waiting for ongoing sync to complete...');
      await sleep(1000);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      logger.warn('Forced shutdown - sync may have been interrupted');
    }

    // Close database connection
    await closeConnection();

    logger.info('Sync worker shut down successfully');
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    throw error;
  }
};

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Handle process signals
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await shutdownWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await shutdownWorker();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdownWorker().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdownWorker().then(() => process.exit(1));
});

/**
 * Start worker
 */
const startWorker = async () => {
  try {
    logger.info('===========================================');
    logger.info('Starting Attendance Sync Worker');
    logger.info('===========================================');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Sync Interval: ${config.device.syncInterval} minutes`);
    logger.info(`Auto-sync enabled: ${config.worker.enableAutoSync}`);
    logger.info('===========================================');

    await initWorker();

    logger.info('Worker is running. Press Ctrl+C to stop.');
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

// Start the worker
startWorker();

export { initWorker, shutdownWorker };
