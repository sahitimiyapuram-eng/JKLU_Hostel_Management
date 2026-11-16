import { Router } from 'express';
import {
  getDashboardStats,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getHostels,
  createHostel,
  getRooms,
  createRoom,
  getAllocations,
  allocateRoom,
  terminateAllocation,
  getFees,
  createFeePayment,
  getComplaints,
  updateComplaintStatus,
  getStaffList,
  getMaintenanceList,
  createMaintenanceTicket,
  getMessList,
} from '../controllers/wardenController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Warden only routes
router.use(authenticate, authorize(['Warden']));

router.get('/stats', getDashboardStats);
router.get('/students', getStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/hostels', getHostels);
router.post('/hostels', createHostel);

router.get('/rooms', getRooms);
router.post('/rooms', createRoom);

router.get('/allocations', getAllocations);
router.post('/allocations', allocateRoom);
router.post('/allocations/:id/terminate', terminateAllocation);

router.get('/fees', getFees);
router.post('/fees', createFeePayment);

router.get('/complaints', getComplaints);
router.patch('/complaints/:id', updateComplaintStatus);

router.get('/staff', getStaffList);
router.get('/maintenance', getMaintenanceList);
router.post('/maintenance', createMaintenanceTicket);
router.get('/mess', getMessList);

export default router;
