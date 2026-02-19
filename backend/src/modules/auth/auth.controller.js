import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../database/index.js';
import { users } from '../../database/schema.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

/**
 * Authentication Controller
 * Handles user authentication and authorization
 */

/**
 * User login
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.username, username),
          eq(users.status, 'active')
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      }
    );

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    logger.info(`User logged in: ${username}`);

    // Remove password from response
    const { passwordHash, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    logger.error('Error in login:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error in getProfile:', error);
    next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info(`Password changed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Error in changePassword:', error);
    next(error);
  }
};

/**
 * Register new user (admin only)
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    // Check if username exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .then(rows => rows[0]);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Check if email exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then(rows => rows[0]);

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        role: role || 'manager',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`New user registered: ${username}`);

    const { passwordHash, ...userData } = newUser[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userData,
    });
  } catch (error) {
    logger.error('Error in register:', error);
    next(error);
  }
};

/**
 * Verify token
 */
export const verifyToken = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: req.user,
    });
  } catch (error) {
    logger.error('Error in verifyToken:', error);
    next(error);
  }
};
