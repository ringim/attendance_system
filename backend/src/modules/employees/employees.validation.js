import Joi from "joi";

/**
 * Validation schemas for employee operations
 */

export const createEmployeeSchema = Joi.object({
  employeeCode: Joi.string().required().max(50),
  name: Joi.string().required().max(255),
  email: Joi.string().email().max(255).allow(null, ""),
  phone: Joi.string().max(20).allow(null, ""),
  department: Joi.string().max(100).allow(null, ""),
  position: Joi.string().max(100).allow(null, ""),
  status: Joi.string()
    .valid("active", "inactive", "suspended")
    .default("active"),
  deviceUserId: Joi.number().integer().allow(null),
  rfidCard: Joi.string().max(50).allow(null, ""),
  metadata: Joi.object().allow(null),
});

export const updateEmployeeSchema = Joi.object({
  employeeCode: Joi.string().max(50),
  name: Joi.string().max(255),
  email: Joi.string().email().max(255).allow(null, ""),
  phone: Joi.string().max(20).allow(null, ""),
  department: Joi.string().max(100).allow(null, ""),
  position: Joi.string().max(100).allow(null, ""),
  status: Joi.string().valid("active", "inactive", "suspended"),
  deviceUserId: Joi.number().integer().allow(null),
  rfidCard: Joi.string().max(50).allow(null, ""),
  metadata: Joi.object().allow(null),
}).min(1);

export const queryEmployeesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(10000).default(50),
  search: Joi.string().allow(""),
  department: Joi.string().allow(""),
  status: Joi.string().valid("active", "inactive", "suspended", ""),
});
