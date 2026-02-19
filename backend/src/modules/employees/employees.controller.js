import { eq, like, or, desc, and, isNull, sql, count } from "drizzle-orm";
import db from "../../database/index.js";
import { employees, devices } from "../../database/schema.js";
import logger from "../../utils/logger.js";
import zkDeviceService from "../../services/zkDevice.service.js";

/**
 * Employee Controller
 * Handles all employee-related operations
 */

/**
 * Get all employees with pagination and filtering
 */
export const getEmployees = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      department = "",
      status = "active",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [isNull(employees.deletedAt)];

    if (status) {
      conditions.push(eq(employees.status, status));
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.employeeCode, `%${search}%`),
          like(employees.email, `%${search}%`),
        ),
      );
    }

    // Get employees
    const employeeList = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(desc(employees.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(employees)
      .where(and(...conditions))
      .then((rows) => parseInt(rows[0].count));

    res.json({
      success: true,
      data: {
        employees: employeeList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error in getEmployees:", error);
    next(error);
  }
};

/**
 * Get single employee by ID
 */
export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error("Error in getEmployeeById:", error);
    next(error);
  }
};

/**
 * Create new employee
 */
export const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;

    // Check if employee code already exists
    const existing = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeCode, employeeData.employeeCode))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Employee code already exists",
      });
    }

    // Create employee
    const newEmployee = await db
      .insert(employees)
      .values({
        ...employeeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`Employee created: ${newEmployee[0].id}`);

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: newEmployee[0],
    });
  } catch (error) {
    logger.error("Error in createEmployee:", error);
    next(error);
  }
};

/**
 * Update employee
 */
export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if employee exists
    const existing = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Update employee
    const updated = await db
      .update(employees)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    logger.info(`Employee updated: ${id}`);

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: updated[0],
    });
  } catch (error) {
    logger.error("Error in updateEmployee:", error);
    next(error);
  }
};

/**
 * Soft delete employee
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const existing = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Soft delete
    await db
      .update(employees)
      .set({
        deletedAt: new Date(),
        status: "inactive",
      })
      .where(eq(employees.id, id));

    logger.info(`Employee deleted: ${id}`);

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    logger.error("Error in deleteEmployee:", error);
    next(error);
  }
};

/**
 * Get departments list
 */
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await db
      .selectDistinct({ department: employees.department })
      .from(employees)
      .where(and(isNull(employees.deletedAt), eq(employees.status, "active")))
      .then((rows) => rows.map((r) => r.department).filter(Boolean));

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    logger.error("Error in getDepartments:", error);
    next(error);
  }
};

/**
 * Bulk import employees
 */
export const bulkImportEmployees = async (req, res, next) => {
  try {
    const { employees: employeeList } = req.body;

    if (!Array.isArray(employeeList) || employeeList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee list",
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const empData of employeeList) {
      try {
        await db.insert(employees).values({
          ...empData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          employeeCode: empData.employeeCode,
          error: error.message,
        });
      }
    }

    logger.info(
      `Bulk import completed: ${results.success} success, ${results.failed} failed`,
    );

    res.json({
      success: true,
      message: "Bulk import completed",
      data: results,
    });
  } catch (error) {
    logger.error("Error in bulkImportEmployees:", error);
    next(error);
  }
};

/**
 * Sync employees from device
 * Imports all users from a ZKTeco device and creates employee records
 */
export const syncFromDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    // Get device info
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    logger.info(
      `Syncing employees from device: ${device.name} (${device.ipAddress})`,
    );

    // Fetch users from device
    const deviceUsers = await zkDeviceService.getUsers({
      ip: device.ipAddress,
      port: device.port,
    });

    if (!deviceUsers || deviceUsers.length === 0) {
      return res.json({
        success: true,
        message: "No users found on device",
        data: { imported: 0, skipped: 0, failed: 0 },
      });
    }

    logger.info(`Fetched ${deviceUsers.length} users from device`);

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Get all existing employees with deviceUserId in one query
    const existingEmployees = await db
      .select({ deviceUserId: employees.deviceUserId })
      .from(employees)
      .where(isNull(employees.deletedAt));

    const existingUserIds = new Set(
      existingEmployees.map((e) => e.deviceUserId).filter((id) => id !== null),
    );

    logger.info(`Found ${existingUserIds.size} existing employees`);

    // Prepare batch insert data
    const newEmployees = [];

    for (const user of deviceUsers) {
      try {
        const userId = parseInt(user.userId);

        // Skip if already exists
        if (existingUserIds.has(userId)) {
          results.skipped++;
          continue;
        }

        // Generate employee code from userId
        const employeeCode = `EMP${user.userId.toString().padStart(6, "0")}`;

        newEmployees.push({
          employeeCode,
          name: user.name || `User ${user.userId}`,
          deviceUserId: userId,
          status: "active",
          metadata: {
            uid: user.uid,
            role: user.role,
            cardno: user.cardno,
            syncedFrom: deviceId,
            syncedAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: user.userId,
          name: user.name,
          error: error.message,
        });
      }
    }

    // Batch insert new employees (in chunks of 100)
    const chunkSize = 100;
    for (let i = 0; i < newEmployees.length; i += chunkSize) {
      const chunk = newEmployees.slice(i, i + chunkSize);
      try {
        await db.insert(employees).values(chunk).onConflictDoNothing({
          target: employees.employeeCode,
        });
        results.imported += chunk.length;
        logger.info(
          `Imported batch ${Math.floor(i / chunkSize) + 1}: ${chunk.length} employees`,
        );
      } catch (error) {
        logger.error(`Failed to import batch:`, error);
        results.failed += chunk.length;
      }
    }

    logger.info(
      `Employee sync completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
    );

    res.json({
      success: true,
      message: "Employee sync completed",
      data: results,
    });
  } catch (error) {
    logger.error("Error in syncFromDevice:", error);
    next(error);
  }
};
