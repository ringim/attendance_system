import { eq, and, gte, desc } from "drizzle-orm";
import db from "../database/index.js";
import {
  devices,
  attendanceLogs,
  syncLogs,
  employees,
} from "../database/schema.js";
import zkDeviceService from "./zkDevice.service.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * Sync Service
 * Handles background synchronization of attendance data from devices
 */
class SyncService {
  constructor() {
    this.isRunning = false;
    this.syncBatchSize = config.worker.syncBatchSize;
  }

  /**
   * Sync all active devices
   * @returns {Promise<Object>} Sync summary
   */
  async syncAllDevices() {
    if (this.isRunning) {
      logger.warn("Sync already in progress, skipping...");
      return { skipped: true };
    }

    this.isRunning = true;
    const startTime = new Date();
    const summary = {
      totalDevices: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRecordsProcessed: 0,
      totalRecordsInserted: 0,
      errors: [],
    };

    try {
      logger.info("Starting device sync operation...");

      // Get all active devices
      const activeDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.status, "active"));

      summary.totalDevices = activeDevices.length;

      if (activeDevices.length === 0) {
        logger.info("No active devices found to sync");
        return summary;
      }

      logger.info(`Found ${activeDevices.length} active devices to sync`);

      // Sync each device
      for (const device of activeDevices) {
        try {
          const result = await this.syncDevice(device.id);

          if (result.success) {
            summary.successfulSyncs++;
            summary.totalRecordsProcessed += result.recordsProcessed;
            summary.totalRecordsInserted += result.recordsInserted;
          } else {
            summary.failedSyncs++;
            summary.errors.push({
              deviceId: device.id,
              deviceName: device.name,
              error: result.error,
            });
          }
        } catch (error) {
          summary.failedSyncs++;
          summary.errors.push({
            deviceId: device.id,
            deviceName: device.name,
            error: error.message,
          });
          logger.error(`Error syncing device ${device.id}:`, error);
        }
      }

      const duration = Date.now() - startTime.getTime();
      logger.info(
        `Sync completed in ${duration}ms: ${summary.successfulSyncs}/${summary.totalDevices} successful, ` +
          `${summary.totalRecordsInserted} records inserted`,
      );

      return summary;
    } catch (error) {
      logger.error("Error in syncAllDevices:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync a single device
   * @param {string} deviceId - Device UUID
   * @returns {Promise<Object>} Sync result
   */
  async syncDevice(deviceId) {
    const syncLogId = crypto.randomUUID();
    const startTime = new Date();

    try {
      logger.info(`Starting sync for device ${deviceId}`);

      // Get device details
      const device = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Create sync log entry
      await db.insert(syncLogs).values({
        id: syncLogId,
        deviceId: device.id,
        startedAt: startTime,
        status: "running",
      });

      // Update device status
      await db
        .update(devices)
        .set({
          lastSeenAt: new Date(),
          isOnline: true,
        })
        .where(eq(devices.id, device.id));

      // Determine from date (last successful sync or 7 days ago)
      const fromDate =
        device.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch attendance logs from device
      const deviceConfig = {
        ip: device.ipAddress,
        port: device.port,
      };

      const rawLogs = await zkDeviceService.fetchAttendanceLogs(
        deviceConfig,
        fromDate,
      );

      logger.info(`Fetched ${rawLogs.length} logs from device ${device.name}`);

      // Process and insert logs
      const result = await this.processAttendanceLogs(rawLogs, device);

      // Update sync log
      await db
        .update(syncLogs)
        .set({
          completedAt: new Date(),
          status: "success",
          recordsProcessed: result.processed,
          recordsInserted: result.inserted,
          recordsSkipped: result.skipped,
        })
        .where(eq(syncLogs.id, syncLogId));

      // Update device last sync time
      await db
        .update(devices)
        .set({
          lastSyncAt: new Date(),
          isOnline: true,
        })
        .where(eq(devices.id, device.id));

      logger.info(
        `Sync completed for device ${device.name}: ` +
          `${result.inserted} inserted, ${result.skipped} skipped`,
      );

      return {
        success: true,
        deviceId: device.id,
        deviceName: device.name,
        recordsProcessed: result.processed,
        recordsInserted: result.inserted,
        recordsSkipped: result.skipped,
      };
    } catch (error) {
      logger.error(`Sync failed for device ${deviceId}:`, error);

      // Update sync log with error
      await db
        .update(syncLogs)
        .set({
          completedAt: new Date(),
          status: "failed",
          errorMessage: error.message,
          errorDetails: { stack: error.stack },
        })
        .where(eq(syncLogs.id, syncLogId))
        .catch((err) => logger.error("Failed to update sync log:", err));

      // Mark device as offline
      await db
        .update(devices)
        .set({
          isOnline: false,
          lastSeenAt: new Date(),
        })
        .where(eq(devices.id, deviceId))
        .catch((err) => logger.error("Failed to update device status:", err));

      return {
        success: false,
        deviceId,
        error: error.message,
        recordsProcessed: 0,
        recordsInserted: 0,
      };
    }
  }

  /**
   * Process and insert attendance logs
   * @param {Array} rawLogs - Raw logs from device
   * @param {Object} device - Device object
   * @returns {Promise<Object>} Processing result
   */
  async processAttendanceLogs(rawLogs, device) {
    let inserted = 0;
    let skipped = 0;
    const processed = rawLogs.length;

    if (rawLogs.length === 0) {
      return { processed, inserted, skipped };
    }

    // Get all employees mapped by deviceUserId for fast lookup
    const employeeMap = await this.getEmployeeMap();

    logger.info(`Employee map has ${employeeMap.size} entries`);

    // Process logs in batches
    for (let i = 0; i < rawLogs.length; i += this.syncBatchSize) {
      const batch = rawLogs.slice(i, i + this.syncBatchSize);

      for (const log of batch) {
        try {
          // Try both number and string versions of deviceUserId
          let employeeId = employeeMap.get(log.deviceUserId);

          if (!employeeId && typeof log.deviceUserId === "string") {
            employeeId = employeeMap.get(parseInt(log.deviceUserId));
          } else if (!employeeId && typeof log.deviceUserId === "number") {
            employeeId = employeeMap.get(log.deviceUserId.toString());
          }

          if (!employeeId) {
            logger.warn(
              `No employee found for device user ID ${log.deviceUserId} (type: ${typeof log.deviceUserId}), skipping log`,
            );
            skipped++;
            continue;
          }

          // Prepare attendance record
          const attendanceRecord = {
            employeeId,
            deviceId: device.id,
            deviceUserId: log.deviceUserId,
            timestamp: log.timestamp,
            direction: log.direction,
            verifyMode: log.verifyMode,
            rawData: log.rawData,
            syncedAt: new Date(),
          };

          // Insert with conflict handling (deduplication)
          await db
            .insert(attendanceLogs)
            .values(attendanceRecord)
            .onConflictDoNothing({
              target: [
                attendanceLogs.employeeId,
                attendanceLogs.deviceId,
                attendanceLogs.timestamp,
              ],
            });

          inserted++;
        } catch (error) {
          logger.error(`Error inserting attendance log:`, error);
          skipped++;
        }
      }
    }

    return { processed, inserted, skipped };
  }

  /**
   * Get employee map (deviceUserId -> employeeId)
   * @returns {Promise<Map>} Employee map
   */
  async getEmployeeMap() {
    const employeeList = await db
      .select({
        id: employees.id,
        deviceUserId: employees.deviceUserId,
      })
      .from(employees)
      .where(eq(employees.status, "active"));

    const map = new Map();

    for (const emp of employeeList) {
      if (emp.deviceUserId) {
        map.set(emp.deviceUserId, emp.id);
      }
    }

    return map;
  }

  /**
   * Get sync statistics
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Statistics
   */
  async getSyncStatistics(days = 7) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await db
      .select()
      .from(syncLogs)
      .where(gte(syncLogs.startedAt, fromDate))
      .orderBy(desc(syncLogs.startedAt))
      .limit(100);

    const stats = {
      totalSyncs: logs.length,
      successfulSyncs: logs.filter((l) => l.status === "success").length,
      failedSyncs: logs.filter((l) => l.status === "failed").length,
      totalRecordsProcessed: logs.reduce(
        (sum, l) => sum + (l.recordsProcessed || 0),
        0,
      ),
      totalRecordsInserted: logs.reduce(
        (sum, l) => sum + (l.recordsInserted || 0),
        0,
      ),
      recentSyncs: logs.slice(0, 10),
    };

    return stats;
  }

  /**
   * Check sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      autoSyncEnabled: config.worker.enableAutoSync,
      syncInterval: config.device.syncInterval,
    };
  }
}

// Export singleton instance
export default new SyncService();
