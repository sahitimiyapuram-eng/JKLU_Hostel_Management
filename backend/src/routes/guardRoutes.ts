import { Router } from 'express';
import {
  searchStudents,
  getVisitors,
  registerVisit,
  checkoutVisitor,
  getSecurityLogs,
  createSecurityLog,
} from '../controllers/guardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Security Guard and Warden routes
router.use(authenticate, authorize(['Security Guard', 'Warden', 'Chief Warden']));

router.get('/students/search', searchStudents);
router.get('/visitors', getVisitors);
router.post('/visitors/register-visit', registerVisit);
router.post('/visitors/:visitId/checkout', checkoutVisitor);
router.get('/security-logs', getSecurityLogs);
router.post('/security-logs', createSecurityLog);

export default router;
