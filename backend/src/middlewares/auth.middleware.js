import jwt from "jsonwebtoken";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * Supports both Authorization header and query parameter (for SSE)
 */
export const authenticate = (req, res, next) => {
  try {
    let token = null;

    // Get token from header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // If no header token, check query parameter (for SSE/EventSource)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    logger.error("Error in authenticate middleware:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Invalid token, but continue without user
    next();
  }
};
