import express from "express";
import * as employeeController from "../modules/employees/employees.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  validate,
  validateUUID,
} from "../middlewares/validation.middleware.js";
import * as validation from "../modules/employees/employees.validation.js";

const router = express.Router();

/**
 * All employee routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/employees
 * @desc    Get all employees with pagination and filtering
 * @access  Private
 */
router.get(
  "/",
  validate(validation.queryEmployeesSchema, "query"),
  employeeController.getEmployees,
);

/**
 * @route   GET /api/employees/departments
 * @desc    Get list of departments
 * @access  Private
 */
router.get("/departments", employeeController.getDepartments);

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee by ID
 * @access  Private
 */
router.get("/:id", validateUUID("id"), employeeController.getEmployeeById);

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorize("admin", "manager"),
  validate(validation.createEmployeeSchema),
  employeeController.createEmployee,
);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorize("admin", "manager"),
  validateUUID("id"),
  validate(validation.updateEmployeeSchema),
  employeeController.updateEmployee,
);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authorize("admin"),
  validateUUID("id"),
  employeeController.deleteEmployee,
);

/**
 * @route   POST /api/employees/bulk-import
 * @desc    Bulk import employees
 * @access  Private (Admin, Manager)
 */
router.post(
  "/bulk-import",
  authorize("admin", "manager"),
  employeeController.bulkImportEmployees,
);

/**
 * @route   POST /api/employees/sync/:deviceId
 * @desc    Sync employees from device
 * @access  Private (Admin, Manager)
 */
router.post(
  "/sync/:deviceId",
  authorize("admin", "manager"),
  validateUUID("deviceId"),
  employeeController.syncFromDevice,
);

export default router;
