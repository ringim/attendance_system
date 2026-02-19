import ZKLib from "node-zklib";
import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * ZKTeco Device Service
 * Handles all interactions with ZKTeco biometric devices
 */
class ZKDeviceService {
  constructor() {
    this.connections = new Map(); // Store active connections
    this.connectionTimeout = config.device.connectionTimeout;
    this.maxRetries = config.device.maxRetries;
  }

  /**
   * Connect to a ZKTeco device
   * @param {Object} deviceConfig - Device configuration
   * @param {string} deviceConfig.ip - Device IP address
   * @param {number} deviceConfig.port - Device port
   * @param {number} deviceConfig.timeout - Connection timeout
   * @returns {Promise<Object>} ZKLib instance
   */
  async connect(deviceConfig) {
    const { ip, port = 4370, timeout = this.connectionTimeout } = deviceConfig;
    const connectionKey = `${ip}:${port}`;

    try {
      logger.info(`Attempting to connect to device at ${connectionKey}`);

      // Create ZKLib instance with positional parameters: (ip, port, timeout, inport)
      const zkInstance = new ZKLib(ip, port, timeout, 4000);

      // Connect with retry logic
      let connected = false;
      let attempts = 0;

      while (!connected && attempts < this.maxRetries) {
        try {
          await zkInstance.createSocket();
          connected = true;
          logger.info(`Successfully connected to device at ${connectionKey}`);
        } catch (error) {
          attempts++;
          if (attempts < this.maxRetries) {
            logger.warn(
              `Connection attempt ${attempts} failed for ${connectionKey}, retrying...`,
            );
            await this.sleep(1000 * attempts); // Exponential backoff
          } else {
            throw error;
          }
        }
      }

      // Store connection
      this.connections.set(connectionKey, {
        instance: zkInstance,
        connectedAt: new Date(),
        ip,
        port,
      });

      return zkInstance;
    } catch (error) {
      logger.error(`Failed to connect to device at ${connectionKey}:`, error);
      throw new Error(`Device connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from a device
   * @param {string} ip - Device IP address
   * @param {number} port - Device port
   */
  async disconnect(ip, port = 4370) {
    const connectionKey = `${ip}:${port}`;
    const connection = this.connections.get(connectionKey);

    if (connection) {
      try {
        await connection.instance.disconnect();
        this.connections.delete(connectionKey);
        logger.info(`Disconnected from device at ${connectionKey}`);
      } catch (error) {
        logger.error(`Error disconnecting from ${connectionKey}:`, error);
      }
    }
  }

  /**
   * Get or create device connection
   * @param {Object} deviceConfig - Device configuration
   * @returns {Promise<Object>} ZKLib instance
   */
  async getConnection(deviceConfig) {
    const { ip, port = 4370 } = deviceConfig;
    const connectionKey = `${ip}:${port}`;
    const existing = this.connections.get(connectionKey);

    // Reuse existing connection if valid
    if (existing) {
      try {
        // Test connection
        await existing.instance.getTime();
        return existing.instance;
      } catch (error) {
        logger.warn(
          `Existing connection to ${connectionKey} is stale, reconnecting...`,
        );
        await this.disconnect(ip, port);
      }
    }

    // Create new connection
    return await this.connect(deviceConfig);
  }

  /**
   * Fetch attendance logs from device
   * @param {Object} deviceConfig - Device configuration
   * @param {Date} fromDate - Fetch logs from this date (optional)
   * @returns {Promise<Array>} Attendance logs
   */
  async fetchAttendanceLogs(deviceConfig, fromDate = null) {
    let zkInstance = null;

    try {
      zkInstance = await this.getConnection(deviceConfig);

      logger.info(
        `Fetching attendance logs from ${deviceConfig.ip}:${deviceConfig.port}`,
      );

      // Get attendance records
      const attendanceData = await zkInstance.getAttendances();

      logger.info(`Raw attendance data type: ${typeof attendanceData}`);
      logger.info(
        `Raw attendance data: ${JSON.stringify(attendanceData).substring(0, 200)}`,
      );

      // Handle different response formats
      let logs = [];

      if (Array.isArray(attendanceData)) {
        logs = attendanceData;
      } else if (attendanceData && attendanceData.data) {
        logs = attendanceData.data;
      } else if (attendanceData && Array.isArray(attendanceData.attendance)) {
        logs = attendanceData.attendance;
      } else {
        logger.warn(
          `Unexpected attendance data format from device ${deviceConfig.ip}`,
        );
        return [];
      }

      // Filter by date if provided
      if (fromDate && logs.length > 0) {
        logs = logs.filter((log) => {
          const logDate = new Date(log.recordTime || log.timestamp);
          return logDate >= fromDate;
        });
      }

      // Parse and normalize logs
      const normalizedLogs = logs.map((log) =>
        this.normalizeAttendanceLog(log, deviceConfig),
      );

      logger.info(
        `Fetched ${normalizedLogs.length} attendance logs from ${deviceConfig.ip}`,
      );

      return normalizedLogs;
    } catch (error) {
      logger.error(
        `Error fetching attendance logs from ${deviceConfig.ip}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Normalize attendance log format
   * @param {Object} rawLog - Raw log from device
   * @param {Object} deviceConfig - Device configuration
   * @returns {Object} Normalized log
   */
  normalizeAttendanceLog(rawLog, deviceConfig) {
    return {
      deviceUserId: rawLog.deviceUserId || rawLog.userId,
      timestamp: this.parseTimestamp(rawLog.recordTime || rawLog.timestamp),
      direction: this.parseDirection(rawLog.checkType),
      verifyMode: rawLog.verifyMode || rawLog.verifyType,
      deviceIp: deviceConfig.ip,
      devicePort: deviceConfig.port,
      rawData: rawLog,
    };
  }

  /**
   * Parse timestamp from device
   * @param {*} timestamp - Timestamp from device
   * @returns {Date} Parsed date
   */
  parseTimestamp(timestamp) {
    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (typeof timestamp === "string") {
      return new Date(timestamp);
    }

    if (typeof timestamp === "number") {
      return new Date(timestamp * 1000); // Convert Unix timestamp
    }

    return new Date();
  }

  /**
   * Parse check type to direction
   * @param {number} checkType - Check type from device
   * @returns {string} Direction (check-in/check-out/break-in/break-out)
   */
  parseDirection(checkType) {
    // ZKTeco check types:
    // 0 = Check In
    // 1 = Check Out
    // 2 = Break Out
    // 3 = Break In
    // 4 = Overtime In
    // 5 = Overtime Out
    const directionMap = {
      0: "check-in",
      1: "check-out",
      2: "break-out",
      3: "break-in",
      4: "overtime-in",
      5: "overtime-out",
    };

    return directionMap[checkType] || null;
  }

  /**
   * Get device information
   * @param {Object} deviceConfig - Device configuration
   * @returns {Promise<Object>} Device info
   */
  async getDeviceInfo(deviceConfig) {
    let zkInstance = null;

    try {
      zkInstance = await this.getConnection(deviceConfig);

      const info = await zkInstance.getInfo();

      return {
        info,
        ip: deviceConfig.ip,
        port: deviceConfig.port,
      };
    } catch (error) {
      logger.error(`Error getting device info from ${deviceConfig.ip}:`, error);
      throw error;
    }
  }

  /**
   * Get all users from device
   * @param {Object} deviceConfig - Device configuration
   * @returns {Promise<Array>} Users
   */
  async getUsers(deviceConfig) {
    let zkInstance = null;

    try {
      zkInstance = await this.getConnection(deviceConfig);

      const usersData = await zkInstance.getUsers();

      return usersData?.data || [];
    } catch (error) {
      logger.error(`Error fetching users from ${deviceConfig.ip}:`, error);
      throw error;
    }
  }

  /**
   * Test device connection
   * @param {Object} deviceConfig - Device configuration
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(deviceConfig) {
    try {
      const zkInstance = await this.connect(deviceConfig);
      const info = await zkInstance.getInfo();
      await this.disconnect(deviceConfig.ip, deviceConfig.port);

      return {
        success: true,
        message: "Connection successful",
        deviceInfo: info,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.toString(),
      };
    }
  }

  /**
   * Clear attendance logs from device
   * @param {Object} deviceConfig - Device configuration
   * @returns {Promise<boolean>} Success status
   */
  async clearAttendanceLogs(deviceConfig) {
    let zkInstance = null;

    try {
      zkInstance = await this.getConnection(deviceConfig);
      await zkInstance.clearAttendanceLog();
      logger.info(`Cleared attendance logs from ${deviceConfig.ip}`);
      return true;
    } catch (error) {
      logger.error(
        `Error clearing attendance logs from ${deviceConfig.ip}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Disconnect all devices
   */
  async disconnectAll() {
    logger.info("Disconnecting all devices...");
    const promises = [];

    for (const [key, connection] of this.connections.entries()) {
      promises.push(
        this.disconnect(connection.ip, connection.port).catch((err) => {
          logger.error(`Error disconnecting ${key}:`, err);
        }),
      );
    }

    await Promise.all(promises);
    this.connections.clear();
    logger.info("All devices disconnected");
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.entries()).map(
        ([key, conn]) => ({
          key,
          ip: conn.ip,
          port: conn.port,
          connectedAt: conn.connectedAt,
        }),
      ),
    };
  }
}

// Export singleton instance
export default new ZKDeviceService();
