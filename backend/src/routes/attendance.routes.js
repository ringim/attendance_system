import express from "express";
import * as attendanceController from "../modules/attendance/attendance.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  validate,
  validateUUID,
} from "../middlewares/validation.middleware.js";
import Joi from "joi";

const router = express.Router();

/**
 * All attendance routes require authentication
 */
router.use(authenticate);

/**
 * Validation schemas
 */
const queryLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  employeeId: Joi.string().uuid().allow(""),
  deviceId: Joi.string().uuid().allow(""),
  startDate: Joi.date().iso().allow(""),
  endDate: Joi.date().iso().allow(""),
  direction: Joi.string().valid("in", "out").allow(""),
});

const manualSyncSchema = Joi.object({
  deviceId: Joi.string().uuid().allow(null, ""),
});

const summarySchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

/**
 * @route   GET /api/attendance/dashboard
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get("/dashboard", attendanceController.getDashboardStats);

/**
 * @route   GET /api/attendance/sync/status
 * @desc    Get sync status
 * @access  Private
 */
router.get("/sync/status", attendanceController.getSyncStatus);

/**
 * @route   GET /api/attendance/sync/statistics
 * @desc    Get sync statistics
 * @access  Private
 */
router.get("/sync/statistics", attendanceController.getSyncStatistics);

/**
 * @route   POST /api/attendance/sync
 * @desc    Trigger manual sync
 * @access  Private (Admin, Manager)
 */
router.post(
  "/sync",
  authorize("admin", "manager"),
  validate(manualSyncSchema),
  attendanceController.triggerManualSync,
);

/**
 * @route   GET /api/attendance/logs
 * @desc    Get attendance logs with filtering
 * @access  Private
 */
router.get(
  "/logs",
  validate(queryLogsSchema, "query"),
  attendanceController.getAttendanceLogs,
);

/**
 * @route   GET /api/attendance/logs/:id
 * @desc    Get attendance log by ID
 * @access  Private
 */
router.get(
  "/logs/:id",
  validateUUID("id"),
  attendanceController.getAttendanceLogById,
);

/**
 * @route   GET /api/attendance/employee/:employeeId/summary
 * @desc    Get employee attendance summary
 * @access  Private
 */
router.get(
  "/employee/:employeeId/summary",
  validateUUID("employeeId"),
  validate(summarySchema, "query"),
  attendanceController.getEmployeeAttendanceSummary,
);

/**
 * @route   GET /api/attendance/realtime/:deviceId
 * @desc    Start real-time monitoring for a device (Server-Sent Events)
 * @access  Private
 */
router.get(
  "/realtime/:deviceId",
  validateUUID("deviceId"),
  attendanceController.startRealTimeMonitoring,
);

/**
 * @route   GET /api/attendance/realtime-all
 * @desc    Start real-time monitoring for ALL devices (Server-Sent Events)
 * @access  Private
 */
router.get("/realtime-all", attendanceController.startRealTimeMonitoringAll);

/**
 * Background Monitoring Routes
 */

/**
 * @route   POST /api/attendance/background-monitor/start
 * @desc    Start persistent background monitoring
 * @access  Private (Admin, Manager)
 */
router.post(
  "/background-monitor/start",
  authorize("admin", "manager"),
  attendanceController.startBackgroundMonitoring,
);

/**
 * @route   POST /api/attendance/background-monitor/stop
 * @desc    Stop persistent background monitoring
 * @access  Private (Admin, Manager)
 */
router.post(
  "/background-monitor/stop",
  authorize("admin", "manager"),
  attendanceController.stopBackgroundMonitoring,
);

/**
 * @route   GET /api/attendance/background-monitor/status
 * @desc    Get background monitoring status
 * @access  Private
 */
router.get(
  "/background-monitor/status",
  attendanceController.getBackgroundMonitoringStatus,
);

/**
 * @route   GET /api/attendance/background-monitor/stream
 * @desc    Real-time stream of background monitoring logs (SSE)
 * @access  Private
 */
router.get(
  "/background-monitor/stream",
  attendanceController.streamBackgroundMonitoringLogs,
);

/**
 * @route   PUT /api/attendance/background-monitor/settings
 * @desc    Update background monitoring settings
 * @access  Private (Admin)
 */
router.put(
  "/background-monitor/settings",
  authorize("admin"),
  attendanceController.updateBackgroundMonitoringSettings,
);

/**
 * @route   POST /api/attendance/background-monitor/device-update/:deviceId
 * @desc    Handle device update for background monitoring
 * @access  Private (Admin, Manager)
 */
router.post(
  "/background-monitor/device-update/:deviceId",
  authorize("admin", "manager"),
  validateUUID("deviceId"),
  attendanceController.handleDeviceUpdate,
);

export default router;
