import { eq, desc, and, isNull } from 'drizzle-orm';
import db from '../../database/index.js';
import { devices } from '../../database/schema.js';
import zkDeviceService from '../../services/zkDevice.service.js';
import logger from '../../utils/logger.js';

/**
 * Device Controller
 * Handles ZKTeco device management operations
 */

/**
 * Get all devices
 */
export const getDevices = async (req, res, next) => {
  try {
    const { status = '' } = req.query;

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
    logger.error('Error in getDevices:', error);
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
      .then(rows => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    logger.error('Error in getDeviceById:', error);
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
        message: 'Failed to connect to device',
        error: testResult.message,
      });
    }

    // Check if device already exists
    const existing = await db
      .select()
      .from(devices)
      .where(eq(devices.ipAddress, deviceData.ipAddress))
      .limit(1)
      .then(rows => rows[0]);

    if (existing && !existing.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Device with this IP address already registered',
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
      message: 'Device registered successfully',
      data: newDevice[0],
    });
  } catch (error) {
    logger.error('Error in registerDevice:', error);
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
      .then(rows => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    const updated = await db
      .update(devices)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning();

    logger.info(`Device updated: ${id}`);

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: updated[0],
    });
  } catch (error) {
    logger.error('Error in updateDevice:', error);
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
      .then(rows => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Soft delete
    await db
      .update(devices)
      .set({
        deletedAt: new Date(),
        status: 'inactive',
      })
      .where(eq(devices.id, id));

    logger.info(`Device deleted: ${id}`);

    res.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteDevice:', error);
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
      .then(rows => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
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
    logger.error('Error in testDeviceConnection:', error);
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
      .then(rows => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
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
    logger.error('Error in getDeviceInfo:', error);
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
      .then(rows => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
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
    logger.error('Error in getDeviceUsers:', error);
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
    logger.error('Error in getConnectionStats:', error);
    next(error);
  }
};
