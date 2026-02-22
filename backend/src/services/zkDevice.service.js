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
  /**
   * Connect to device with support for different connection types
   */
  async connect(deviceConfig) {
    const {
      ip,
      port = 4370,
      timeout = this.connectionTimeout,
      connectionType = "tcp",
      admsConfig = null,
    } = deviceConfig;

    const connectionKey = `${ip}:${port}:${connectionType}`;

    try {
      logger.info(
        `Attempting to connect to device at ${connectionKey} via ${connectionType.toUpperCase()}`,
      );

      let zkInstance;

      switch (connectionType) {
        case "tcp":
        case "wifi":
          // Standard TCP/IP connection (WiFi or LAN)
          zkInstance = new ZKLib(ip, port, timeout, 4000);
          break;

        case "lan":
          // LAN connection (same as TCP but with specific config)
          zkInstance = new ZKLib(ip, port, timeout, 4000);
          // Add any LAN-specific configuration here
          break;

        case "adms":
          // ADMS (ZKTeco Access Control Management System) connection
          if (!admsConfig) {
            throw new Error(
              "ADMS configuration is required for ADMS connection type",
            );
          }
          zkInstance = await this.connectViaADMS(ip, port, admsConfig, timeout);
          break;

        default:
          throw new Error(`Unsupported connection type: ${connectionType}`);
      }

      // Connect with retry logic
      let connected = false;
      let attempts = 0;

      while (!connected && attempts < this.maxRetries) {
        try {
          if (connectionType === "adms") {
            // ADMS connections might have different connection method
            await zkInstance.connect();
          } else {
            await zkInstance.createSocket();
          }
          connected = true;
          logger.info(
            `Successfully connected to device at ${connectionKey} via ${connectionType.toUpperCase()}`,
          );
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

      // Store connection with type info
      this.connections.set(connectionKey, {
        instance: zkInstance,
        connectedAt: new Date(),
        ip,
        port,
        connectionType,
        admsConfig,
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
    let parsedDate;

    if (timestamp instanceof Date) {
      parsedDate = timestamp;
    } else if (typeof timestamp === "string") {
      parsedDate = new Date(timestamp);
    } else if (typeof timestamp === "number") {
      parsedDate = new Date(timestamp * 1000); // Convert Unix timestamp
    } else {
      parsedDate = new Date();
    }

    // Validate the date is reasonable (between 2000 and 2100)
    const year = parsedDate.getFullYear();
    if (isNaN(parsedDate.getTime()) || year < 2000 || year > 2100) {
      logger.warn(
        `Invalid timestamp detected: ${timestamp}, using current time instead`,
      );
      return new Date();
    }

    return parsedDate;
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

  /**
   * Clear cached connection for a device
   * Useful when device IP or port changes
   * @param {string} oldIp - Previous IP address
   * @param {number} oldPort - Previous port
   * @param {string} connectionType - Connection type
   */
  async clearCachedConnection(oldIp, oldPort = 4370, connectionType = "tcp") {
    const connectionKey = `${oldIp}:${oldPort}:${connectionType}`;
    const connection = this.connections.get(connectionKey);

    if (connection) {
      try {
        await connection.instance.disconnect();
        this.connections.delete(connectionKey);
        logger.info(`Cleared cached connection for ${connectionKey}`);
        return { success: true, message: "Cached connection cleared" };
      } catch (error) {
        logger.error(
          `Error clearing cached connection for ${connectionKey}:`,
          error,
        );
        this.connections.delete(connectionKey); // Remove anyway
        return { success: false, message: error.message };
      }
    }

    return { success: true, message: "No cached connection found" };
  }

  /**
   * Clear all cached connections for a device (all connection types)
   * @param {string} ip - IP address
   * @param {number} port - Port
   */
  async clearAllCachedConnections(ip, port = 4370) {
    const connectionTypes = ["tcp", "wifi", "lan", "adms"];
    const results = [];

    for (const type of connectionTypes) {
      const result = await this.clearCachedConnection(ip, port, type);
      if (result.success && result.message !== "No cached connection found") {
        results.push(`${type}: ${result.message}`);
      }
    }

    return {
      success: true,
      message:
        results.length > 0 ? results.join(", ") : "No cached connections found",
      clearedConnections: results.length,
    };
  }

  /**
   * Clear cached connection for a device
   * Useful when device IP or port changes
   * @param {string} oldIp - Previous IP address
   * @param {number} oldPort - Previous port
   * @param {string} connectionType - Connection type
   */
  async clearCachedConnection(oldIp, oldPort = 4370, connectionType = "tcp") {
    const connectionKey = `${oldIp}:${oldPort}:${connectionType}`;
    const connection = this.connections.get(connectionKey);

    if (connection) {
      try {
        await connection.instance.disconnect();
        this.connections.delete(connectionKey);
        logger.info(`Cleared cached connection for ${connectionKey}`);
        return { success: true, message: "Cached connection cleared" };
      } catch (error) {
        logger.error(
          `Error clearing cached connection for ${connectionKey}:`,
          error,
        );
        this.connections.delete(connectionKey); // Remove anyway
        return { success: false, message: error.message };
      }
    }

    return { success: true, message: "No cached connection found" };
  }

  /**
   * Clear all cached connections for a device (all connection types)
   * @param {string} ip - IP address
   * @param {number} port - Port
   */
  async clearAllCachedConnections(ip, port = 4370) {
    const connectionTypes = ["tcp", "wifi", "lan", "adms"];
    const results = [];

    for (const type of connectionTypes) {
      const result = await this.clearCachedConnection(ip, port, type);
      if (result.success && result.message !== "No cached connection found") {
        results.push(`${type}: ${result.message}`);
      }
    }

    return {
      success: true,
      message:
        results.length > 0 ? results.join(", ") : "No cached connections found",
      clearedConnections: results.length,
    };
  }
  /**
   * Clear cached connection for a device
   * Useful when device IP or port changes
   * @param {string} oldIp - Previous IP address
   * @param {number} oldPort - Previous port
   * @param {string} connectionType - Connection type
   */
  async clearCachedConnection(oldIp, oldPort = 4370, connectionType = "tcp") {
    const connectionKey = `${oldIp}:${oldPort}:${connectionType}`;
    const connection = this.connections.get(connectionKey);

    if (connection) {
      try {
        await connection.instance.disconnect();
        this.connections.delete(connectionKey);
        logger.info(`Cleared cached connection for ${connectionKey}`);
        return { success: true, message: "Cached connection cleared" };
      } catch (error) {
        logger.error(
          `Error clearing cached connection for ${connectionKey}:`,
          error,
        );
        this.connections.delete(connectionKey); // Remove anyway
        return { success: false, message: error.message };
      }
    }

    return { success: true, message: "No cached connection found" };
  }

  /**
   * Clear all cached connections for a device (all connection types)
   * @param {string} ip - IP address
   * @param {number} port - Port
   */
  async clearAllCachedConnections(ip, port = 4370) {
    const connectionTypes = ["tcp", "wifi", "lan", "adms"];
    const results = [];

    for (const type of connectionTypes) {
      const result = await this.clearCachedConnection(ip, port, type);
      if (result.success && result.message !== "No cached connection found") {
        results.push(`${type}: ${result.message}`);
      }
    }

    return {
      success: true,
      message:
        results.length > 0 ? results.join(", ") : "No cached connections found",
      clearedConnections: results.length,
    };
  }

  /**
   * Connect to device via ADMS (ZKTeco Access Control Management System)
   */
  async connectViaADMS(ip, port, admsConfig, timeout) {
    try {
      logger.info(`Connecting via ADMS to ${ip}:${port}`);

      // ADMS connection configuration
      const {
        serverUrl,
        username,
        password,
        deviceSN,
        protocol = "http",
      } = admsConfig;

      if (!serverUrl || !username || !password || !deviceSN) {
        throw new Error(
          "ADMS configuration incomplete. Required: serverUrl, username, password, deviceSN",
        );
      }

      // For ADMS, we might need to use a different approach
      // This is a placeholder for ADMS-specific connection logic
      // You would need to implement the actual ADMS protocol here

      // Create a mock ZKLib instance for ADMS
      const zkInstance = {
        isADMS: true,
        config: admsConfig,

        // Implement ADMS-specific methods
        async getUsers() {
          return await this.admsRequest("GET", "/users");
        },

        async getAttendances() {
          return await this.admsRequest("GET", "/attendances");
        },

        async getInfo() {
          return await this.admsRequest("GET", "/device/info");
        },

        async connect() {
          // ADMS connection logic
          logger.info(`ADMS connection established to ${serverUrl}`);
          return true;
        },

        async disconnect() {
          logger.info(`ADMS connection closed to ${serverUrl}`);
          return true;
        },

        // ADMS HTTP request helper
        async admsRequest(method, endpoint, data = null) {
          // This would implement the actual ADMS API calls
          // For now, return mock data
          logger.warn("ADMS integration is not fully implemented yet");
          return {
            data: [],
            success: false,
            message: "ADMS integration pending",
          };
        },
      };

      return zkInstance;
    } catch (error) {
      logger.error("ADMS connection failed:", error);
      throw error;
    }
  }

  /**
   * Get connection type display name
   */
  getConnectionTypeDisplay(connectionType) {
    const types = {
      tcp: "TCP/IP (WiFi)",
      wifi: "WiFi (TCP/IP)",
      lan: "LAN (Ethernet)",
      adms: "ADMS (ZKTeco Server)",
    };
    return types[connectionType] || connectionType.toUpperCase();
  }

  /**
   * Validate connection configuration
   */
  validateConnectionConfig(connectionType, config) {
    switch (connectionType) {
      case "tcp":
      case "wifi":
      case "lan":
        if (!config.ip || !config.port) {
          throw new Error(
            "IP address and port are required for TCP/LAN connections",
          );
        }
        break;

      case "adms":
        if (!config.admsConfig) {
          throw new Error("ADMS configuration is required");
        }
        const { serverUrl, username, password, deviceSN } = config.admsConfig;
        if (!serverUrl || !username || !password || !deviceSN) {
          throw new Error(
            "ADMS config must include: serverUrl, username, password, deviceSN",
          );
        }
        break;

      default:
        throw new Error(`Unsupported connection type: ${connectionType}`);
    }

    return true;
  }
}

// Export singleton instance
export default new ZKDeviceService();
