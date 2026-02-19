import { eq, and, gte, lte, desc, sql, isNull } from "drizzle-orm";
import db from "../../database/index.js";
import { attendanceLogs, employees, devices } from "../../database/schema.js";
import syncService from "../../services/sync.service.js";
import logger from "../../utils/logger.js";

/**
 * Attendance Controller
 * Handles attendance log operations
 */

/**
 * Get attendance logs with filtering and pagination
 */
export const getAttendanceLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      employeeId = "",
      deviceId = "",
      startDate = "",
      endDate = "",
      direction = "",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (employeeId) {
      conditions.push(eq(attendanceLogs.employeeId, employeeId));
    }

    if (deviceId) {
      conditions.push(eq(attendanceLogs.deviceId, deviceId));
    }

    if (startDate) {
      conditions.push(gte(attendanceLogs.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(attendanceLogs.timestamp, new Date(endDate)));
    }

    if (direction) {
      conditions.push(eq(attendanceLogs.direction, direction));
    }

    // Get logs with employee and device info
    const logs = await db
      .select({
        id: attendanceLogs.id,
        timestamp: attendanceLogs.timestamp,
        direction: attendanceLogs.direction,
        verifyMode: attendanceLogs.verifyMode,
        status: attendanceLogs.status,
        syncedAt: attendanceLogs.syncedAt,
        employee: {
          id: employees.id,
          code: employees.employeeCode,
          name: employees.name,
          department: employees.department,
        },
        device: {
          id: devices.id,
          name: devices.name,
          location: devices.location,
        },
      })
      .from(attendanceLogs)
      .leftJoin(employees, eq(attendanceLogs.employeeId, employees.id))
      .leftJoin(devices, eq(attendanceLogs.deviceId, devices.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendanceLogs.timestamp))
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: sql`count(*)` })
      .from(attendanceLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .then((rows) => parseInt(rows[0].count));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error in getAttendanceLogs:", error);
    next(error);
  }
};

/**
 * Get attendance log by ID
 */
export const getAttendanceLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await db
      .select({
        log: attendanceLogs,
        employee: employees,
        device: devices,
      })
      .from(attendanceLogs)
      .leftJoin(employees, eq(attendanceLogs.employeeId, employees.id))
      .leftJoin(devices, eq(attendanceLogs.deviceId, devices.id))
      .where(eq(attendanceLogs.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Attendance log not found",
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    logger.error("Error in getAttendanceLogById:", error);
    next(error);
  }
};

/**
 * Get employee attendance summary
 */
export const getEmployeeAttendanceSummary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const conditions = [
      eq(attendanceLogs.employeeId, employeeId),
      gte(attendanceLogs.timestamp, new Date(startDate)),
      lte(attendanceLogs.timestamp, new Date(endDate)),
    ];

    // Get all logs
    const logs = await db
      .select()
      .from(attendanceLogs)
      .where(and(...conditions))
      .orderBy(attendanceLogs.timestamp);

    // Calculate statistics
    const summary = {
      totalLogs: logs.length,
      checkIns: logs.filter((l) => l.direction === "in").length,
      checkOuts: logs.filter((l) => l.direction === "out").length,
      present: 0,
      absent: 0,
      late: 0,
      earlyLeave: 0,
      logs: logs,
    };

    // Group by date for daily attendance
    const dailyAttendance = logs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {});

    summary.dailyAttendance = dailyAttendance;

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error("Error in getEmployeeAttendanceSummary:", error);
    next(error);
  }
};

/**
 * Trigger manual sync
 */
export const triggerManualSync = async (req, res, next) => {
  try {
    const { deviceId } = req.body;

    if (deviceId) {
      // Sync specific device
      const result = await syncService.syncDevice(deviceId);

      res.json({
        success: result.success,
        message: result.success ? "Sync completed successfully" : "Sync failed",
        data: result,
      });
    } else {
      // Sync all devices
      const result = await syncService.syncAllDevices();

      res.json({
        success: true,
        message: "Sync initiated for all devices",
        data: result,
      });
    }
  } catch (error) {
    logger.error("Error in triggerManualSync:", error);
    next(error);
  }
};

/**
 * Get sync status
 */
export const getSyncStatus = async (req, res, next) => {
  try {
    const status = syncService.getSyncStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("Error in getSyncStatus:", error);
    next(error);
  }
};

/**
 * Get sync statistics
 */
export const getSyncStatistics = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const stats = await syncService.getSyncStatistics(parseInt(days));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error in getSyncStatistics:", error);
    next(error);
  }
};

/**
 * Get attendance dashboard statistics
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's attendance count
    const todayCount = await db
      .select({ count: sql`count(*)` })
      .from(attendanceLogs)
      .where(
        and(
          gte(attendanceLogs.timestamp, today),
          lte(attendanceLogs.timestamp, tomorrow),
        ),
      )
      .then((rows) => parseInt(rows[0].count));

    // Total employees
    const totalEmployees = await db
      .select({ count: sql`count(*)` })
      .from(employees)
      .where(and(eq(employees.status, "active"), isNull(employees.deletedAt)))
      .then((rows) => parseInt(rows[0].count));

    // Active devices
    const activeDevices = await db
      .select({ count: sql`count(*)` })
      .from(devices)
      .where(and(eq(devices.status, "active"), eq(devices.isOnline, true)))
      .then((rows) => parseInt(rows[0].count));

    // Recent logs
    const recentLogs = await db
      .select({
        id: attendanceLogs.id,
        timestamp: attendanceLogs.timestamp,
        direction: attendanceLogs.direction,
        employee: {
          name: employees.name,
          code: employees.employeeCode,
        },
        device: {
          name: devices.name,
        },
      })
      .from(attendanceLogs)
      .leftJoin(employees, eq(attendanceLogs.employeeId, employees.id))
      .leftJoin(devices, eq(attendanceLogs.deviceId, devices.id))
      .orderBy(desc(attendanceLogs.timestamp))
      .limit(10);

    res.json({
      success: true,
      data: {
        todayAttendance: todayCount,
        totalEmployees,
        activeDevices,
        recentLogs,
      },
    });
  } catch (error) {
    logger.error("Error in getDashboardStats:", error);
    next(error);
  }
};

/**
 * Start real-time monitoring for ALL devices
 * Monitors multiple devices simultaneously
 */
export const startRealTimeMonitoringAll = async (req, res, next) => {
  try {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({ type: "connected", message: "Multi-device monitoring started" })}\n\n`,
    );

    // Import device service
    const { default: zkDeviceService } =
      await import("../../services/zkDevice.service.js");

    // Get all active devices
    const activeDevices = await db
      .select()
      .from(devices)
      .where(and(eq(devices.status, "active"), eq(devices.isOnline, true)));

    if (activeDevices.length === 0) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "No active devices found" })}\n\n`,
      );
      res.end();
      return;
    }

    logger.info(
      `Starting real-time monitoring for ${activeDevices.length} devices`,
    );

    const zkInstances = [];

    // Connect to all devices and start monitoring
    for (const device of activeDevices) {
      try {
        const zkInstance = await zkDeviceService.connect({
          ip: device.ipAddress,
          port: device.port,
        });

        // Listen for real-time logs
        zkInstance.getRealTimeLogs(async (rawLog) => {
          try {
            logger.info(`Real-time log from ${device.name}:`, rawLog);

            // Normalize the log
            const normalizedLog = zkDeviceService.normalizeAttendanceLog(
              rawLog,
              {
                ip: device.ipAddress,
                port: device.port,
              },
            );

            // Get employee info
            const employee = await db
              .select()
              .from(employees)
              .where(
                eq(
                  employees.deviceUserId,
                  parseInt(normalizedLog.deviceUserId),
                ),
              )
              .limit(1)
              .then((rows) => rows[0]);

            if (employee) {
              // Insert into database
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
                })
                .returning();

              // Send to client
              const eventData = {
                type: "attendance",
                data: {
                  ...insertedLog[0],
                  employee: {
                    id: employee.id,
                    code: employee.employeeCode,
                    name: employee.name,
                    department: employee.department,
                  },
                  device: {
                    id: device.id,
                    name: device.name,
                    location: device.location,
                  },
                },
              };

              res.write(`data: ${JSON.stringify(eventData)}\n\n`);
            } else {
              logger.warn(
                `No employee found for device user ID: ${normalizedLog.deviceUserId}`,
              );
            }
          } catch (error) {
            logger.error(
              `Error processing real-time log from ${device.name}:`,
              error,
            );
          }
        });

        zkInstances.push({ device, zkInstance });

        res.write(
          `data: ${JSON.stringify({ type: "device_connected", device: device.name })}\n\n`,
        );
      } catch (error) {
        logger.error(`Failed to connect to device ${device.name}:`, error);
        res.write(
          `data: ${JSON.stringify({ type: "device_error", device: device.name, message: error.message })}\n\n`,
        );
      }
    }

    // Handle client disconnect
    req.on("close", async () => {
      logger.info(`Client disconnected from multi-device monitoring`);
      for (const { device, zkInstance } of zkInstances) {
        try {
          await zkDeviceService.disconnect(device.ipAddress, device.port);
        } catch (error) {
          logger.error(`Error disconnecting from ${device.name}:`, error);
        }
      }
      res.end();
    });
  } catch (error) {
    logger.error("Error in startRealTimeMonitoringAll:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
    );
    res.end();
  }
};

/**
 * Start real-time monitoring for a device
 * Uses Server-Sent Events (SSE) to push real-time attendance logs
 */
export const startRealTimeMonitoring = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({ type: "connected", message: "Real-time monitoring started" })}\n\n`,
    );

    // Import device service
    const { default: zkDeviceService } =
      await import("../../services/zkDevice.service.js");

    // Get device info
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Device not found" })}\n\n`,
      );
      res.end();
      return;
    }

    logger.info(`Starting real-time monitoring for device: ${device.name}`);

    // Connect to device and start monitoring
    const zkInstance = await zkDeviceService.connect({
      ip: device.ipAddress,
      port: device.port,
    });

    // Listen for real-time logs
    zkInstance.getRealTimeLogs(async (rawLog) => {
      try {
        logger.info("Real-time log received:", rawLog);

        // Normalize the log
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
          // Insert into database
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
            })
            .returning();

          // Send to client
          const eventData = {
            type: "attendance",
            data: {
              ...insertedLog[0],
              employee: {
                id: employee.id,
                code: employee.employeeCode,
                name: employee.name,
                department: employee.department,
              },
              device: {
                id: device.id,
                name: device.name,
                location: device.location,
              },
            },
          };

          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        } else {
          logger.warn(
            `No employee found for device user ID: ${normalizedLog.deviceUserId}`,
          );
          res.write(
            `data: ${JSON.stringify({ type: "warning", message: `Unknown user: ${normalizedLog.deviceUserId}` })}\n\n`,
          );
        }
      } catch (error) {
        logger.error("Error processing real-time log:", error);
        res.write(
          `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
        );
      }
    });

    // Handle client disconnect
    req.on("close", async () => {
      logger.info(
        `Client disconnected from real-time monitoring for device: ${device.name}`,
      );
      await zkDeviceService.disconnect(device.ipAddress, device.port);
      res.end();
    });
  } catch (error) {
    logger.error("Error in startRealTimeMonitoring:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
    );
    res.end();
  }
};
