import { Router } from 'express';
import {
  getStudentProfile,
  getStudentRoom,
  getStudentFees,
  getStudentComplaints,
  createStudentComplaint,
  getStudentMess,
  getStudentVisitors,
  getStudentSecurityLogs,
} from '../controllers/studentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Student routes (accessible to Student and Wardens for oversight)
router.use(authenticate, authorize(['Student', 'Warden', 'Chief Warden']));

router.get('/profile', getStudentProfile);
router.get('/room', getStudentRoom);
router.get('/fees', getStudentFees);
router.get('/complaints', getStudentComplaints);
router.post('/complaints', createStudentComplaint);
router.get('/mess', getStudentMess);
router.get('/visitors', getStudentVisitors);
router.get('/security-logs', getStudentSecurityLogs);

export default router;
