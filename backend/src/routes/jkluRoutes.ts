import { Router } from 'express';
import {
  getDashboardStats,
  getStudents,
  updateStudentRollNumber,
  getRooms,
  getRegisterComplaints,
  addRegisterComplaint,
  updateRegisterComplaint,
  getCleaningRegister,
  addCleaningEntry,
  getStudentOutRegister,
  addStudentOutEntry,
  markStudentReturned,
  getLateNightEntries,
  addLateNightEntry,
  getAttendanceRegister,
  addAttendanceEntry,
  getMaintenanceRegister,
  addMaintenanceEntry,
  completeMaintenanceEntry,
  getSecurityHandover,
  addSecurityHandover,
  getMessMenu,
  updateMessMenu,
} from '../controllers/jkluController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All JKLU routes require authentication
router.use(authenticate, authorize(['Chief Warden', 'Warden', 'Security Guard', 'Student']));

// Stats & Overview
router.get('/stats', getDashboardStats);

// Students
router.get('/students', getStudents);
router.put('/students/:id/roll-number', updateStudentRollNumber);

// Rooms
router.get('/rooms', getRooms);

// Register: Complaints (register_complaints)
router.get('/registers/complaints', getRegisterComplaints);
router.post('/registers/complaints', addRegisterComplaint);
router.patch('/registers/complaints/:id', updateRegisterComplaint);

// Register: Cleaning (cleaning_register)
router.get('/registers/cleaning', getCleaningRegister);
router.post('/registers/cleaning', addCleaningEntry);

// Register: Student Out (student_out_register)
router.get('/registers/student-out', getStudentOutRegister);
router.post('/registers/student-out', addStudentOutEntry);
router.patch('/registers/student-out/:id/in', markStudentReturned);

// Register: Late Night Entry (late_night_entry)
router.get('/registers/late-night', getLateNightEntries);
router.post('/registers/late-night', addLateNightEntry);

// Register: Attendance (attendance_register)
router.get('/registers/attendance', getAttendanceRegister);
router.post('/registers/attendance', addAttendanceEntry);

// Register: Maintenance (maintenance_register)
router.get('/registers/maintenance', getMaintenanceRegister);
router.post('/registers/maintenance', addMaintenanceEntry);
router.patch('/registers/maintenance/:id/complete', completeMaintenanceEntry);

// Register: Security Handover (security_handover)
router.get('/registers/security-handover', getSecurityHandover);
router.post('/registers/security-handover', addSecurityHandover);

// Mess Weekly Menu Timetable
router.get('/mess/menu', getMessMenu);
router.put('/mess/menu/:id', updateMessMenu);

export default router;
