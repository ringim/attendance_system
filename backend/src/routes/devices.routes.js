import express from 'express';
import * as deviceController from '../modules/devices/devices.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateUUID } from '../middlewares/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

/**
 * All device routes require authentication
 */
router.use(authenticate);

/**
 * Validation schemas
 */
const registerDeviceSchema = Joi.object({
  name: Joi.string().required().max(100),
  deviceId: Joi.string().max(50).allow(null, ''),
  serialNumber: Joi.string().max(100).allow(null, ''),
  model: Joi.string().max(50).default('S900'),
  ipAddress: Joi.string().required().max(45),
  port: Joi.number().integer().default(4370),
  location: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  connectionConfig: Joi.object().allow(null),
});

const updateDeviceSchema = Joi.object({
  name: Joi.string().max(100),
  deviceId: Joi.string().max(50).allow(null, ''),
  serialNumber: Joi.string().max(100).allow(null, ''),
  model: Joi.string().max(50),
  ipAddress: Joi.string().max(45),
  port: Joi.number().integer(),
  location: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  status: Joi.string().valid('active', 'inactive', 'error'),
  connectionConfig: Joi.object().allow(null),
}).min(1);

/**
 * @route   GET /api/devices
 * @desc    Get all devices
 * @access  Private
 */
router.get('/', deviceController.getDevices);

/**
 * @route   GET /api/devices/stats
 * @desc    Get connection statistics
 * @access  Private
 */
router.get('/stats', deviceController.getConnectionStats);

/**
 * @route   GET /api/devices/:id
 * @desc    Get device by ID
 * @access  Private
 */
router.get('/:id', validateUUID('id'), deviceController.getDeviceById);

/**
 * @route   POST /api/devices
 * @desc    Register new device
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authorize('admin', 'manager'),
  validate(registerDeviceSchema),
  deviceController.registerDevice
);

/**
 * @route   PUT /api/devices/:id
 * @desc    Update device
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authorize('admin', 'manager'),
  validateUUID('id'),
  validate(updateDeviceSchema),
  deviceController.updateDevice
);

/**
 * @route   DELETE /api/devices/:id
 * @desc    Delete device
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  validateUUID('id'),
  deviceController.deleteDevice
);

/**
 * @route   POST /api/devices/:id/test
 * @desc    Test device connection
 * @access  Private
 */
router.post(
  '/:id/test',
  validateUUID('id'),
  deviceController.testDeviceConnection
);

/**
 * @route   GET /api/devices/:id/info
 * @desc    Get device information
 * @access  Private
 */
router.get(
  '/:id/info',
  validateUUID('id'),
  deviceController.getDeviceInfo
);

/**
 * @route   GET /api/devices/:id/users
 * @desc    Get users from device
 * @access  Private
 */
router.get(
  '/:id/users',
  validateUUID('id'),
  deviceController.getDeviceUsers
);

export default router;
