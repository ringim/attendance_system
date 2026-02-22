import EventEmitter from "events";
import logger from "../utils/logger.js";
import zkDeviceService from "./zkDevice.service.js";
import db from "../database/index.js";
import { devices, attendanceLogs, employees } from "../database/schema.js";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Background Monitoring Service
 * Provides persistent real-time monitoring that runs independently of frontend connections
 */
class BackgroundMonitorService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.monitoringDevices = new Map(); // deviceId -> monitoring config
    this.intervals = new Map(); // deviceId -> interval reference
    this.lastLogCounts = new Map(); // deviceId -> last log count
    this.settings = {
      pollInterval: 10000, // 10 seconds (increased from 3 seconds)
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
    };
  }

  /**
   * Start background monitoring for all enabled devices
   */
  async startGlobalMonitoring() {
    try {
      if (this.isRunning) {
        logger.warn("Background monitoring is already running");
        return { success: false, message: "Already running" };
      }

      logger.info("Starting global background monitoring...");

      // Get all active devices
      const activeDevices = await db
        .select()
        .from(devices)
        .where(and(eq(devices.isOnline, true), isNull(devices.deletedAt)));

      if (activeDevices.length === 0) {
        return { success: false, message: "No active devices found" };
      }

      // Start monitoring each device
      for (const device of activeDevices) {
        await this.startDeviceMonitoring(device.id);
      }

      this.isRunning = true;
      logger.info(
        `Background monitoring started for ${activeDevices.length} devices`,
      );

      return {
        success: true,
        message: `Monitoring ${activeDevices.length} devices`,
        devices: activeDevices.length,
      };
    } catch (error) {
      logger.error("Failed to start global monitoring:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop all background monitoring
   */
  async stopGlobalMonitoring() {
    try {
      logger.info("Stopping global background monitoring...");

      // Stop all device monitoring
      for (const deviceId of this.monitoringDevices.keys()) {
        await this.stopDeviceMonitoring(deviceId);
      }

      this.isRunning = false;
      this.monitoringDevices.clear();
      this.intervals.clear();
      this.lastLogCounts.clear();

      logger.info("Background monitoring stopped");
      return { success: true, message: "Monitoring stopped" };
    } catch (error) {
      logger.error("Failed to stop monitoring:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Start monitoring a specific device
   */
  async startDeviceMonitoring(deviceId) {
    try {
      // Get device info
      const device = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Stop existing monitoring if any
      if (this.intervals.has(deviceId)) {
        await this.stopDeviceMonitoring(deviceId);
      }

      logger.info(
        `Starting background monitoring for device: ${device.name} (${device.ipAddress})`,
      );

      // Initialize last log count
      const initialLogs = await zkDeviceService.fetchAttendanceLogs({
        ip: device.ipAddress,
        port: device.port,
        connectionType: device.connectionType || "tcp",
      });

      this.lastLogCounts.set(deviceId, initialLogs?.length || 0);

      // Start polling interval
      const intervalId = setInterval(async () => {
        await this.pollDevice(deviceId, device);
      }, this.settings.pollInterval);

      this.intervals.set(deviceId, intervalId);
      this.monitoringDevices.set(deviceId, {
        device,
        startedAt: new Date(),
        status: "active",
      });

      return {
        success: true,
        message: `Monitoring started for ${device.name}`,
      };
    } catch (error) {
      logger.error(`Failed to start monitoring for device ${deviceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop monitoring a specific device
   */
  async stopDeviceMonitoring(deviceId) {
    try {
      const intervalId = this.intervals.get(deviceId);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(deviceId);
      }

      const config = this.monitoringDevices.get(deviceId);
      if (config) {
        logger.info(
          `Stopped background monitoring for device: ${config.device.name}`,
        );
        this.monitoringDevices.delete(deviceId);
      }

      this.lastLogCounts.delete(deviceId);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to stop monitoring for device ${deviceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Poll a device for new attendance logs
   */
  async pollDevice(deviceId, device) {
    try {
      // Get current logs from device with better error handling
      let currentLogs;
      try {
        currentLogs = await zkDeviceService.fetchAttendanceLogs({
          ip: device.ipAddress,
          port: device.port,
          connectionType: device.connectionType || "tcp",
        });
      } catch (connectionError) {
        // If connection fails, clear any cached connections and retry once
        logger.warn(
          `Connection error for device ${device.name}, clearing cache and retrying...`,
        );
        await zkDeviceService.clearAllCachedConnections(
          device.ipAddress,
          device.port,
        );

        // Wait a bit before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          currentLogs = await zkDeviceService.fetchAttendanceLogs({
            ip: device.ipAddress,
            port: device.port,
            connectionType: device.connectionType || "tcp",
          });
        } catch (retryError) {
          throw new Error(`Failed after retry: ${retryError.message}`);
        }
      }

      const currentCount = currentLogs?.length || 0;
      const lastCount = this.lastLogCounts.get(deviceId) || 0;

      // Check if there are new logs
      if (currentCount > lastCount) {
        const newLogsCount = currentCount - lastCount;
        logger.info(
          `Device ${device.name}: Found ${newLogsCount} new attendance logs`,
        );

        // Get the new logs (last N entries)
        const newLogs = currentLogs.slice(-newLogsCount);

        // Process and save new logs
        for (const log of newLogs) {
          await this.processNewLog(deviceId, device, log);
        }

        // Update last count
        this.lastLogCounts.set(deviceId, currentCount);

        // Emit event for real-time updates
        this.emit("newAttendance", {
          deviceId,
          device: device.name,
          logs: newLogs,
          count: newLogsCount,
        });
      }

      // Update device status
      await this.updateDeviceStatus(deviceId, "online");
    } catch (error) {
      logger.error(`Error polling device ${device.name}:`, error);

      // Clear cached connections on error to prevent stale connections
      try {
        await zkDeviceService.clearAllCachedConnections(
          device.ipAddress,
          device.port,
        );
      } catch (clearError) {
        logger.warn(
          `Failed to clear cached connections: ${clearError.message}`,
        );
      }

      await this.updateDeviceStatus(deviceId, "error");

      // Emit error event
      this.emit("deviceError", {
        deviceId,
        device: device.name,
        error: error.message,
      });
    }
  }

  /**
   * Process and save a new attendance log
   */
  async processNewLog(deviceId, device, log) {
    try {
      // Find employee by device user ID
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.deviceUserId, parseInt(log.deviceUserId)))
        .limit(1)
        .then((rows) => rows[0]);

      // Prepare log data
      const logData = {
        deviceId: deviceId,
        employeeId: employee?.id || null,
        deviceUserId: parseInt(log.deviceUserId),
        timestamp: new Date(log.recordTime),
        direction: this.parseDirection(log.checkType),
        verifyMode: this.parseVerifyMode(log.verifyType),
        status: "synced",
        syncedAt: new Date(),
        metadata: {
          rawCheckType: log.checkType,
          rawVerifyType: log.verifyType,
          source: "background_monitor",
        },
      };

      // Save to database (ignore duplicates)
      await db.insert(attendanceLogs).values(logData).onConflictDoNothing();

      logger.info(
        `Saved attendance log: User ${log.deviceUserId} at ${log.recordTime}`,
      );
    } catch (error) {
      logger.error("Error processing new log:", error);
    }
  }

  /**
   * Update device online status
   */
  async updateDeviceStatus(deviceId, status) {
    try {
      await db
        .update(devices)
        .set({
          isOnline: status === "online",
          lastSeenAt: new Date(),
        })
        .where(eq(devices.id, deviceId));
    } catch (error) {
      logger.error(`Error updating device status:`, error);
    }
  }

  /**
   * Parse check type to direction
   */
  parseDirection(checkType) {
    const directions = {
      0: "check-in",
      1: "check-out",
      2: "break-out",
      3: "break-in",
      4: "overtime-in",
      5: "overtime-out",
    };
    return directions[checkType] || null;
  }

  /**
   * Parse verify type to mode
   */
  parseVerifyMode(verifyType) {
    const modes = {
      0: "password",
      1: "fingerprint",
      2: "card",
      3: "face",
      4: "palm",
      15: "combination",
    };
    return modes[verifyType] || "unknown";
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      devicesCount: this.monitoringDevices.size,
      devices: Array.from(this.monitoringDevices.entries()).map(
        ([id, config]) => ({
          id,
          name: config.device.name,
          ip: config.device.ipAddress,
          status: config.status,
          startedAt: config.startedAt,
        }),
      ),
      settings: this.settings,
    };
  }

  /**
   * Update monitoring settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    logger.info("Background monitoring settings updated:", this.settings);
  }

  /**
   * Refresh device information for a monitored device
   * Useful when device settings are updated
   */
  async refreshDeviceInfo(deviceId) {
    try {
      // Get updated device info from database
      const device = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Update the cached device info if it's being monitored
      const config = this.monitoringDevices.get(deviceId);
      if (config) {
        config.device = device;
        this.monitoringDevices.set(deviceId, config);
        logger.info(
          `Refreshed device info for: ${device.name} (${device.ipAddress})`,
        );
      }

      return { success: true, message: "Device info refreshed" };
    } catch (error) {
      logger.error(`Failed to refresh device info for ${deviceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Restart monitoring for a specific device
   * Useful when device connection settings change
   */
  async restartDeviceMonitoring(deviceId) {
    try {
      const wasMonitoring = this.intervals.has(deviceId);

      if (wasMonitoring) {
        await this.stopDeviceMonitoring(deviceId);
        await this.startDeviceMonitoring(deviceId);
        return { success: true, message: "Device monitoring restarted" };
      } else {
        return { success: false, message: "Device was not being monitored" };
      }
    } catch (error) {
      logger.error(
        `Failed to restart monitoring for device ${deviceId}:`,
        error,
      );
      return { success: false, message: error.message };
    }
  }
}

// Create singleton instance
const backgroundMonitorService = new BackgroundMonitorService();

export default backgroundMonitorService;
