import express from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employees.routes.js';
import deviceRoutes from './devices.routes.js';
import attendanceRoutes from './attendance.routes.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/devices', deviceRoutes);
router.use('/attendance', attendanceRoutes);

export default router;
