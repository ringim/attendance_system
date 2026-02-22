import EventEmitter from "events";
import logger from "../utils/logger.js";
import zkDeviceService from "./zkDevice.service.js";
import db from "../database/index.js";
import { devices, attendanceLogs, employees } from "../database/schema.js";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Simple Background Monitoring Service
 * Uses the same approach as manual monitoring but runs in background
 */
class SimpleBackgroundMonitorService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.monitoredDevices = new Map(); // deviceId -> { device, zkInstance }
    this.stats = {
      totalLogs: 0,
      devicesConnected: 0,
      lastLogTime: null,
    };
  }

  /**
   * Start background monitoring for all active devices
   */
  async startGlobalMonitoring() {
    try {
      if (this.isRunning) {
        logger.warn("Simple background monitoring is already running");
        return { success: false, message: "Already running" };
      }

      logger.info("Starting simple background monitoring...");

      // Get all active devices
      const activeDevices = await db
        .select()
        .from(devices)
        .where(and(eq(devices.isOnline, true), isNull(devices.deletedAt)));

      if (activeDevices.length === 0) {
        return { success: false, message: "No active devices found" };
      }

      // Connect to each device using the same method as manual monitoring
      for (const device of activeDevices) {
        await this.startDeviceMonitoring(device);
      }

      this.isRunning = true;
      logger.info(
        `Simple background monitoring started for ${activeDevices.length} devices`,
      );

      return {
        success: true,
        message: `Monitoring ${activeDevices.length} devices`,
        devices: activeDevices.length,
      };
    } catch (error) {
      logger.error("Failed to start simple background monitoring:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Start monitoring a specific device using real-time logs (same as manual monitoring)
   */
  async startDeviceMonitoring(device) {
    try {
      logger.info(
        `Starting simple background monitoring for device: ${device.name} (${device.ipAddress})`,
      );

      // Connect to device using the same method as manual monitoring
      const zkInstance = await zkDeviceService.connect({
        ip: device.ipAddress,
        port: device.port,
      });

      // Listen for real-time logs (same as manual monitoring)
      zkInstance.getRealTimeLogs(async (rawLog) => {
        try {
          logger.info(`Background real-time log from ${device.name}:`, rawLog);

          // Normalize the log (same as manual monitoring)
          const normalizedLog = zkDeviceService.normalizeAttendanceLog(rawLog, {
            ip: device.ipAddress,
            port: device.port,
          });

          // Get employee info
          const employee = await db
            .select()
            .from(employees)
            .where(
              eq(employees.deviceUserId, parseInt(normalizedLog.deviceUserId)),
            )
            .limit(1)
            .then((rows) => rows[0]);

          if (employee) {
            // Insert into database (same as manual monitoring)
            const insertedLog = await db
              .insert(attendanceLogs)
              .values({
                employeeId: employee.id,
                deviceId: device.id,
                deviceUserId: normalizedLog.deviceUserId,
                timestamp: normalizedLog.timestamp,
                direction: normalizedLog.direction,
                verifyMode: normalizedLog.verifyMode,
                rawData: normalizedLog.rawData,
                syncedAt: new Date(),
                status: "synced",
                metadata: {
                  source: "simple_background_monitor",
                  deviceName: device.name,
                  employeeName: employee.name,
                },
              })
              .returning();

            // Update stats
            this.stats.totalLogs++;
            this.stats.lastLogTime = new Date();

            // Emit event for any listeners
            this.emit("newAttendance", {
              deviceId: device.id,
              device: device.name,
              log: insertedLog[0],
              employee: {
                id: employee.id,
                code: employee.employeeCode,
                name: employee.name,
                department: employee.department,
              },
            });

            logger.info(
              `Background monitoring saved attendance: ${employee.name} at ${normalizedLog.timestamp}`,
            );
          } else {
            logger.warn(
              `Background monitoring: No employee found for device user ID: ${normalizedLog.deviceUserId}`,
            );
          }
        } catch (error) {
          logger.error(
            `Error processing background real-time log from ${device.name}:`,
            error,
          );
        }
      });

      // Store the connection
      this.monitoredDevices.set(device.id, {
        device,
        zkInstance,
        startedAt: new Date(),
        status: "active",
      });

      this.stats.devicesConnected++;

      logger.info(`Simple background monitoring connected to: ${device.name}`);
      return { success: true, message: `Connected to ${device.name}` };
    } catch (error) {
      logger.error(
        `Failed to start monitoring for device ${device.name}:`,
        error,
      );
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop all background monitoring
   */
  async stopGlobalMonitoring() {
    try {
      logger.info("Stopping simple background monitoring...");

      // Disconnect from all devices
      for (const [
        deviceId,
        { device, zkInstance },
      ] of this.monitoredDevices.entries()) {
        try {
          await zkDeviceService.disconnect(device.ipAddress, device.port);
          logger.info(`Disconnected from ${device.name}`);
        } catch (error) {
          logger.error(`Error disconnecting from ${device.name}:`, error);
        }
      }

      this.isRunning = false;
      this.monitoredDevices.clear();
      this.stats.devicesConnected = 0;

      logger.info("Simple background monitoring stopped");
      return { success: true, message: "Monitoring stopped" };
    } catch (error) {
      logger.error("Failed to stop simple background monitoring:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      devicesCount: this.monitoredDevices.size,
      devices: Array.from(this.monitoredDevices.entries()).map(
        ([id, config]) => ({
          id,
          name: config.device.name,
          ip: config.device.ipAddress,
          status: config.status,
          startedAt: config.startedAt,
        }),
      ),
      stats: this.stats,
      settings: {
        method: "real-time-events",
        polling: false,
        description: "Uses same method as manual monitoring",
      },
    };
  }

  /**
   * Update monitoring settings (placeholder for compatibility)
   */
  updateSettings(newSettings) {
    logger.info("Simple background monitoring settings:", newSettings);
  }
}

// Create singleton instance
const simpleBackgroundMonitorService = new SimpleBackgroundMonitorService();

export default simpleBackgroundMonitorService;
