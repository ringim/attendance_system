import { eq, desc, and, isNull } from "drizzle-orm";
import db from "../../database/index.js";
import { devices } from "../../database/schema.js";
import zkDeviceService from "../../services/zkDevice.service.js";
import logger from "../../utils/logger.js";

/**
 * Device Controller
 * Handles ZKTeco device management operations
 */

/**
 * Get all devices
 */
export const getDevices = async (req, res, next) => {
  try {
    const { status = "" } = req.query;

    const conditions = [isNull(devices.deletedAt)];

    if (status) {
      conditions.push(eq(devices.status, status));
    }

    const deviceList = await db
      .select()
      .from(devices)
      .where(and(...conditions))
      .orderBy(desc(devices.createdAt));

    res.json({
      success: true,
      data: deviceList,
    });
  } catch (error) {
    logger.error("Error in getDevices:", error);
    next(error);
  }
};

/**
 * Get device by ID
 */
export const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    logger.error("Error in getDeviceById:", error);
    next(error);
  }
};

/**
 * Register new device
 */
export const registerDevice = async (req, res, next) => {
  try {
    const deviceData = req.body;

    // Test connection first
    const testResult = await zkDeviceService.testConnection({
      ip: deviceData.ipAddress,
      port: deviceData.port || 4370,
    });

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to connect to device",
        error: testResult.message,
      });
    }

    // Check if device already exists
    const existing = await db
      .select()
      .from(devices)
      .where(eq(devices.ipAddress, deviceData.ipAddress))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing && !existing.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Device with this IP address already registered",
      });
    }

    // Register device
    const newDevice = await db
      .insert(devices)
      .values({
        ...deviceData,
        isOnline: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`Device registered: ${newDevice[0].id}`);

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      data: newDevice[0],
    });
  } catch (error) {
    logger.error("Error in registerDevice:", error);
    next(error);
  }
};

/**
 * Update device
 */
export const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // If IP address or port is being updated, test the new connection first
    const isConnectionUpdate = updateData.ipAddress || updateData.port;
    if (isConnectionUpdate) {
      // Clear old cached connections before testing new ones
      if (updateData.ipAddress && updateData.ipAddress !== existing.ipAddress) {
        try {
          await zkDeviceService.clearAllCachedConnections(
            existing.ipAddress,
            existing.port,
          );
          logger.info(
            `Cleared cached connections for old IP: ${existing.ipAddress}`,
          );
        } catch (error) {
          logger.warn("Failed to clear old cached connections:", error);
        }
      }

      const testResult = await zkDeviceService.testConnection({
        ip: updateData.ipAddress || existing.ipAddress,
        port: updateData.port || existing.port,
      });

      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to connect to device with new settings",
          error: testResult.message,
        });
      }

      // Update connection status
      updateData.isOnline = true;
      updateData.lastSeenAt = new Date();
    }

    const updated = await db
      .update(devices)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning();

    // If this device is being monitored by background service, restart monitoring with new settings
    if (isConnectionUpdate) {
      try {
        const backgroundMonitorService = (
          await import("../../services/backgroundMonitor.service.js")
        ).default;
        const monitoringStatus = backgroundMonitorService.getStatus();

        // Check if this device is currently being monitored
        const isBeingMonitored = monitoringStatus.devices.some(
          (device) => device.id === id,
        );

        if (isBeingMonitored) {
          logger.info(
            `Restarting background monitoring for updated device: ${id}`,
          );

          // Stop current monitoring
          await backgroundMonitorService.stopDeviceMonitoring(id);

          // Start monitoring with updated device info
          await backgroundMonitorService.startDeviceMonitoring(id);

          logger.info(
            `Background monitoring restarted for device: ${updated[0].name}`,
          );
        }
      } catch (error) {
        logger.warn(
          "Failed to restart background monitoring for updated device:",
          error,
        );
        // Don't fail the update if monitoring restart fails
      }
    }

    logger.info(
      `Device updated: ${id}${isConnectionUpdate ? " (connection settings changed)" : ""}`,
    );

    res.json({
      success: true,
      message: "Device updated successfully",
      data: updated[0],
    });
  } catch (error) {
    logger.error("Error in updateDevice:", error);
    next(error);
  }
};

/**
 * Delete device
 */
export const deleteDevice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // Soft delete
    await db
      .update(devices)
      .set({
        deletedAt: new Date(),
        status: "inactive",
      })
      .where(eq(devices.id, id));

    logger.info(`Device deleted: ${id}`);

    res.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error) {
    logger.error("Error in deleteDevice:", error);
    next(error);
  }
};

/**
 * Test device connection
 */
export const testDeviceConnection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const testResult = await zkDeviceService.testConnection({
      ip: device.ipAddress,
      port: device.port,
    });

    // Update device status
    await db
      .update(devices)
      .set({
        isOnline: testResult.success,
        lastSeenAt: new Date(),
      })
      .where(eq(devices.id, id));

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.deviceInfo || null,
    });
  } catch (error) {
    logger.error("Error in testDeviceConnection:", error);
    next(error);
  }
};

/**
 * Get device info
 */
export const getDeviceInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const info = await zkDeviceService.getDeviceInfo({
      ip: device.ipAddress,
      port: device.port,
    });

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error("Error in getDeviceInfo:", error);
    next(error);
  }
};

/**
 * Get users from device
 */
export const getDeviceUsers = async (req, res, next) => {
  try {
    const { id } = req.params;

    const device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const users = await zkDeviceService.getUsers({
      ip: device.ipAddress,
      port: device.port,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Error in getDeviceUsers:", error);
    next(error);
  }
};

/**
 * Get connection statistics
 */
export const getConnectionStats = async (req, res, next) => {
  try {
    const stats = zkDeviceService.getConnectionStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error in getConnectionStats:", error);
    next(error);
  }
};
