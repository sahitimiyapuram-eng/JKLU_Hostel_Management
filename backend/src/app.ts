import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import wardenRoutes from './routes/wardenRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import guardRoutes from './routes/guardRoutes.js';
import jkluRoutes from './routes/jkluRoutes.js';
import { getDatabaseStatus } from './config/db.js';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Public System Health & DB Status Endpoint
app.get('/api/system/status', (req: Request, res: Response) => {
  const status = getDatabaseStatus();
  res.json({
    success: true,
    application: 'JKLU Hostel Management System API',
    status,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/jklu', jkluRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/guard', guardRoutes);

// 404 Route handler for unrecognized API paths
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found` });
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  // Security requirement: Never return raw stack traces or internal DB credentials
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred while processing request',
  });
});

export default app;
