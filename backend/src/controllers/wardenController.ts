import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool, getMockState, getDatabaseStatus } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// -------------------------------------------------------------
// Warden Dashboard Metrics / Stats
// -------------------------------------------------------------
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [[{ totalStudents }]]: any = await pool.query('SELECT COUNT(*) AS totalStudents FROM Student');
      const [[{ totalHostels }]]: any = await pool.query('SELECT COUNT(*) AS totalHostels FROM Hostel');
      const [[{ totalRooms, occupiedRooms, vacantRooms }]]: any = await pool.query(
        `SELECT 
          COUNT(*) AS totalRooms,
          SUM(CASE WHEN current_occupancy >= capacity THEN 1 ELSE 0 END) AS occupiedRooms,
          SUM(CASE WHEN current_occupancy < capacity AND status = 'Available' THEN 1 ELSE 0 END) AS vacantRooms
        FROM Room`
      );
      const [[{ pendingComplaints }]]: any = await pool.query(
        "SELECT COUNT(*) AS pendingComplaints FROM Complaint WHERE status IN ('Pending', 'In Progress')"
      );
      const [[{ pendingFees }]]: any = await pool.query(
        "SELECT COALESCE(SUM(due_amount), 0) AS pendingFees FROM Fee_Payment WHERE status IN ('Pending', 'Overdue')"
      );
      const [[{ visitorsInside }]]: any = await pool.query(
        "SELECT COUNT(*) AS visitorsInside FROM Visit WHERE status = 'Inside'"
      );

      res.json({
        success: true,
        stats: {
          totalStudents: Number(totalStudents) || 0,
          totalHostels: Number(totalHostels) || 0,
          totalRooms: Number(totalRooms) || 0,
          occupiedRooms: Number(occupiedRooms) || 0,
          vacantRooms: Number(vacantRooms) || 0,
          pendingComplaints: Number(pendingComplaints) || 0,
          pendingFees: Number(pendingFees) || 0,
          visitorsInside: Number(visitorsInside) || 0,
        },
      });
      return;
    }

    // Fallback store
    const mock = getMockState();
    const totalStudents = mock.students.length;
    const totalHostels = mock.hostels.length;
    const totalRooms = mock.rooms.length;
    const occupiedRooms = mock.rooms.filter((r) => r.current_occupancy >= r.capacity).length;
    const vacantRooms = mock.rooms.filter((r) => r.current_occupancy < r.capacity && r.status === 'Available').length;
    const pendingComplaints = mock.complaints.filter((c) => c.status === 'Pending' || c.status === 'In Progress').length;
    const pendingFees = mock.fee_payments
      .filter((f) => f.status === 'Pending' || f.status === 'Overdue')
      .reduce((acc, curr) => acc + Number(curr.due_amount || 0), 0);
    const visitorsInside = mock.visits.filter((v) => v.status === 'Inside').length;

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalHostels,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        pendingComplaints,
        pendingFees,
        visitorsInside,
      },
    });
  } catch (err: any) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
}

// -------------------------------------------------------------
// Students CRUD
// -------------------------------------------------------------
export async function getStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT 
          s.student_id, s.student_code, s.name, s.email, s.phone, s.emergency_contact, 
          s.department, s.year_of_study, s.gender, s.blood_group, s.created_at,
          a.allocation_id, a.status AS allocation_status,
          r.room_id, r.room_number, h.hostel_name
        FROM Student s
        LEFT JOIN Allocation a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN Room r ON a.room_id = r.room_id
        LEFT JOIN Hostel h ON r.hostel_id = h.hostel_id
      `;
      const params: any[] = [];
      if (query) {
        sql += ` WHERE LOWER(s.name) LIKE ? OR LOWER(s.student_code) LIKE ? OR LOWER(s.email) LIKE ? OR LOWER(s.department) LIKE ?`;
        const qp = `%${query}%`;
        params.push(qp, qp, qp, qp);
      }
      sql += ' ORDER BY s.student_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, students: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.students.map((s) => {
      const alloc = mock.allocations.find((a) => a.student_id === s.student_id && a.status === 'Active');
      let room_number = null;
      let hostel_name = null;
      let room_id = null;
      if (alloc) {
        const room = mock.rooms.find((r) => r.room_id === alloc.room_id);
        if (room) {
          room_id = room.room_id;
          room_number = room.room_number;
          const hostel = mock.hostels.find((h) => h.hostel_id === room.hostel_id);
          if (hostel) hostel_name = hostel.hostel_name;
        }
      }
      return {
        ...s,
        allocation_id: alloc?.allocation_id || null,
        allocation_status: alloc?.status || 'Unallocated',
        room_id,
        room_number,
        hostel_name,
      };
    });

    if (query) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.student_code.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.department.toLowerCase().includes(query)
      );
    }
    res.json({ success: true, students: list });
  } catch (err: any) {
    console.error('getStudents error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve students' });
  }
}

export async function createStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    student_code,
    name,
    email,
    phone,
    emergency_contact,
    department,
    year_of_study,
    gender,
    blood_group,
    password,
  } = req.body;

  if (!student_code || !name || !email || !phone || !emergency_contact || !department || !year_of_study || !gender) {
    res.status(400).json({ success: false, message: 'Please provide all required student details' });
    return;
  }

  const rawPassword = password || 'student123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Check unique student_code or email
      const [existing]: any = await pool.query(
        'SELECT student_id FROM Student WHERE student_code = ? OR email = ?',
        [student_code, email]
      );
      if (existing.length > 0) {
        res.status(409).json({ success: false, message: 'A student with this code or email already exists' });
        return;
      }

      const [result]: any = await pool.query(
        `INSERT INTO Student 
        (student_code, name, email, phone, emergency_contact, department, year_of_study, password_hash, gender, blood_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_code, name, email, phone, emergency_contact, department, year_of_study, hashedPassword, gender, blood_group || null]
      );

      res.status(201).json({
        success: true,
        message: 'Student record created successfully',
        student_id: result.insertId,
      });
      return;
    }

    const mock = getMockState();
    const exists = mock.students.some(
      (s) => s.student_code.toLowerCase() === student_code.toLowerCase() || s.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      res.status(409).json({ success: false, message: 'A student with this code or email already exists' });
      return;
    }

    const newId = (mock.students[mock.students.length - 1]?.student_id || 0) + 1;
    const newStudent = {
      student_id: newId,
      student_code,
      name,
      email,
      phone,
      emergency_contact,
      department,
      year_of_study: Number(year_of_study),
      password_hash: hashedPassword,
      plain_password: rawPassword,
      gender,
      blood_group: blood_group || 'O+',
      created_at: new Date().toISOString(),
    };
    mock.students.unshift(newStudent);

    res.status(201).json({
      success: true,
      message: 'Student record created successfully',
      student_id: newId,
      student: newStudent,
    });
  } catch (err: any) {
    console.error('createStudent error:', err);
    res.status(500).json({ success: false, message: 'Database error while creating student' });
  }
}

export async function updateStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = parseInt(req.params.id, 10);
  const { name, email, phone, emergency_contact, department, year_of_study, gender, blood_group } = req.body;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        `UPDATE Student 
         SET name = ?, email = ?, phone = ?, emergency_contact = ?, department = ?, year_of_study = ?, gender = ?, blood_group = ?
         WHERE student_id = ?`,
        [name, email, phone, emergency_contact, department, year_of_study, gender, blood_group, studentId]
      );
      res.json({ success: true, message: 'Student record updated successfully' });
      return;
    }

    const mock = getMockState();
    const student = mock.students.find((s) => s.student_id === studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    Object.assign(student, { name, email, phone, emergency_contact, department, year_of_study, gender, blood_group });
    res.json({ success: true, message: 'Student record updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
}

export async function deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = parseInt(req.params.id, 10);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Check active allocation
      const [allocations]: any = await pool.query(
        "SELECT allocation_id, room_id FROM Allocation WHERE student_id = ? AND status = 'Active'",
        [studentId]
      );
      if (allocations.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete student with active room allocation. Please de-allocate or terminate room allocation first.',
        });
        return;
      }
      await pool.query('DELETE FROM Student WHERE student_id = ?', [studentId]);
      res.json({ success: true, message: 'Student deleted successfully' });
      return;
    }

    const mock = getMockState();
    const activeAlloc = mock.allocations.find((a) => a.student_id === studentId && a.status === 'Active');
    if (activeAlloc) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete student with active room allocation. Please de-allocate first.',
      });
      return;
    }

    mock.students = mock.students.filter((s) => s.student_id !== studentId);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete student. Foreign key constraints may apply.' });
  }
}

// -------------------------------------------------------------
// Hostels & Rooms
// -------------------------------------------------------------
export async function getHostels(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const sql = `
        SELECT 
          h.hostel_id, h.hostel_name, h.warden_id, h.total_floors, h.gender, h.address, h.created_at,
          w.name AS warden_name,
          COUNT(r.room_id) AS total_rooms,
          COALESCE(SUM(r.capacity), 0) AS total_capacity,
          COALESCE(SUM(r.current_occupancy), 0) AS total_occupied
        FROM Hostel h
        LEFT JOIN Warden w ON h.warden_id = w.warden_id
        LEFT JOIN Room r ON h.hostel_id = r.hostel_id
        GROUP BY h.hostel_id
        ORDER BY h.hostel_id ASC
      `;
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, hostels: rows });
      return;
    }

    const mock = getMockState();
    const result = mock.hostels.map((h) => {
      const warden = mock.wardens.find((w) => w.warden_id === h.warden_id);
      const rooms = mock.rooms.filter((r) => r.hostel_id === h.hostel_id);
      const total_capacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
      const total_occupied = rooms.reduce((acc, r) => acc + r.current_occupancy, 0);
      return {
        ...h,
        warden_name: warden?.name || 'Assigned Warden',
        total_rooms: rooms.length,
        total_capacity,
        total_occupied,
      };
    });

    res.json({ success: true, hostels: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get hostels' });
  }
}

export async function createHostel(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_name, warden_id, total_floors, gender, address } = req.body;
  if (!hostel_name || !gender || !address) {
    res.status(400).json({ success: false, message: 'Please provide hostel name, gender, and address' });
    return;
  }

  const assignedWardenId = warden_id || req.user?.id || 1;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        'INSERT INTO Hostel (hostel_name, warden_id, total_floors, gender, address) VALUES (?, ?, ?, ?, ?)',
        [hostel_name, assignedWardenId, total_floors || 3, gender, address]
      );
      res.status(201).json({ success: true, message: 'Hostel created successfully', hostel_id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.hostels[mock.hostels.length - 1]?.hostel_id || 0) + 1;
    const newHostel = {
      hostel_id: newId,
      hostel_name,
      warden_id: Number(assignedWardenId),
      total_floors: Number(total_floors) || 3,
      gender,
      address,
    };
    mock.hostels.push(newHostel);
    res.status(201).json({ success: true, message: 'Hostel created successfully', hostel: newHostel });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error creating hostel' });
  }
}

export async function getRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
  const hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id as string, 10) : null;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT r.room_id, r.hostel_id, r.room_number, r.floor_number, r.capacity, 
               r.current_occupancy, r.status, r.monthly_fee, h.hostel_name
        FROM Room r
        JOIN Hostel h ON r.hostel_id = h.hostel_id
      `;
      const params: any[] = [];
      if (hostelId) {
        sql += ' WHERE r.hostel_id = ?';
        params.push(hostelId);
      }
      sql += ' ORDER BY r.hostel_id, r.floor_number, r.room_number';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, rooms: rows });
      return;
    }

    const mock = getMockState();
    let rooms = mock.rooms.map((r) => {
      const hostel = mock.hostels.find((h) => h.hostel_id === r.hostel_id);
      return {
        ...r,
        hostel_name: hostel?.hostel_name || 'Unknown Hostel',
      };
    });
    if (hostelId) {
      rooms = rooms.filter((r) => r.hostel_id === hostelId);
    }
    res.json({ success: true, rooms });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rooms' });
  }
}

export async function createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_id, room_number, floor_number, capacity, monthly_fee } = req.body;
  if (!hostel_id || !room_number || !floor_number) {
    res.status(400).json({ success: false, message: 'Please provide hostel, room number, and floor number' });
    return;
  }

  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [existing]: any = await pool.query(
        'SELECT room_id FROM Room WHERE hostel_id = ? AND room_number = ?',
        [hostel_id, room_number]
      );
      if (existing.length > 0) {
        res.status(409).json({ success: false, message: `Room ${room_number} already exists in this hostel` });
        return;
      }

      const [result]: any = await pool.query(
        'INSERT INTO Room (hostel_id, room_number, floor_number, capacity, monthly_fee) VALUES (?, ?, ?, ?, ?)',
        [hostel_id, room_number, floor_number, capacity || 2, monthly_fee || 4500.00]
      );
      res.status(201).json({ success: true, message: 'Room added successfully', room_id: result.insertId });
      return;
    }

    const mock = getMockState();
    const exists = mock.rooms.some((r) => r.hostel_id === Number(hostel_id) && r.room_number.toLowerCase() === room_number.toLowerCase());
    if (exists) {
      res.status(409).json({ success: false, message: `Room ${room_number} already exists in this hostel` });
      return;
    }

    const newId = (mock.rooms[mock.rooms.length - 1]?.room_id || 0) + 1;
    const newRoom = {
      room_id: newId,
      hostel_id: Number(hostel_id),
      room_number,
      floor_number: Number(floor_number),
      capacity: Number(capacity) || 2,
      current_occupancy: 0,
      status: 'Available',
      monthly_fee: Number(monthly_fee) || 4500.00,
    };
    mock.rooms.push(newRoom);
    res.status(201).json({ success: true, message: 'Room added successfully', room: newRoom });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create room' });
  }
}

// -------------------------------------------------------------
// Allocations (Multi-step database transaction & validation)
// -------------------------------------------------------------
export async function getAllocations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const sql = `
        SELECT 
          a.allocation_id, a.student_id, a.room_id, a.start_date, a.end_date, a.status, a.notes, a.created_at,
          s.name AS student_name, s.student_code, s.phone AS student_phone, s.gender AS student_gender,
          r.room_number, r.capacity, r.current_occupancy,
          h.hostel_name, h.gender AS hostel_gender
        FROM Allocation a
        JOIN Student s ON a.student_id = s.student_id
        JOIN Room r ON a.room_id = r.room_id
        JOIN Hostel h ON r.hostel_id = h.hostel_id
        ORDER BY a.allocation_id DESC
      `;
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, allocations: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.allocations.map((a) => {
      const s = mock.students.find((st) => st.student_id === a.student_id);
      const r = mock.rooms.find((rm) => rm.room_id === a.room_id);
      const h = r ? mock.hostels.find((hst) => hst.hostel_id === r.hostel_id) : null;
      return {
        ...a,
        student_name: s?.name || 'Unknown',
        student_code: s?.student_code || '',
        student_phone: s?.phone || '',
        student_gender: s?.gender || '',
        room_number: r?.room_number || '',
        capacity: r?.capacity || 2,
        current_occupancy: r?.current_occupancy || 0,
        hostel_name: h?.hostel_name || '',
        hostel_gender: h?.gender || '',
      };
    }).reverse();

    res.json({ success: true, allocations: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get allocations' });
  }
}

export async function allocateRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { student_id, room_id, start_date, notes } = req.body;
  if (!student_id || !room_id) {
    res.status(400).json({ success: false, message: 'Student ID and Room ID are required for allocation' });
    return;
  }

  const allocStartDate = start_date || new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. Verify student doesn't already have an Active allocation
        const [activeStudentAllocs]: any = await connection.query(
          "SELECT allocation_id, room_id FROM Allocation WHERE student_id = ? AND status = 'Active' FOR UPDATE",
          [student_id]
        );
        if (activeStudentAllocs.length > 0) {
          await connection.rollback();
          res.status(400).json({
            success: false,
            message: 'Student already has an active room allocation. Terminate current allocation before re-allocating.',
          });
          return;
        }

        // 2. Lock and verify Room capacity and availability
        const [roomRows]: any = await connection.query(
          'SELECT room_id, capacity, current_occupancy, status FROM Room WHERE room_id = ? FOR UPDATE',
          [room_id]
        );
        if (roomRows.length === 0) {
          await connection.rollback();
          res.status(404).json({ success: false, message: 'Target room does not exist' });
          return;
        }

        const room = roomRows[0];
        if (room.status === 'Maintenance') {
          await connection.rollback();
          res.status(400).json({ success: false, message: 'Room is currently under maintenance and cannot be allocated' });
          return;
        }

        if (room.current_occupancy >= room.capacity) {
          await connection.rollback();
          res.status(400).json({
            success: false,
            message: `Room is already at full capacity (${room.current_occupancy}/${room.capacity}). Cannot allocate.`,
          });
          return;
        }

        // 3. Insert allocation record
        const [insertResult]: any = await connection.query(
          "INSERT INTO Allocation (student_id, room_id, start_date, status, notes) VALUES (?, ?, ?, 'Active', ?)",
          [student_id, room_id, allocStartDate, notes || 'Standard allocation']
        );

        // 4. Update room occupancy
        const newOccupancy = room.current_occupancy + 1;
        const newStatus = newOccupancy >= room.capacity ? 'Full' : 'Available';
        await connection.query(
          'UPDATE Room SET current_occupancy = ?, status = ? WHERE room_id = ?',
          [newOccupancy, newStatus, room_id]
        );

        await connection.commit();

        res.status(201).json({
          success: true,
          message: 'Room allocated to student successfully',
          allocation_id: insertResult.insertId,
          room: { room_id, current_occupancy: newOccupancy, status: newStatus },
        });
        return;
      } catch (txnError: any) {
        await connection.rollback();
        throw txnError;
      } finally {
        connection.release();
      }
    }

    // Fallback store simulation
    const mock = getMockState();
    const existing = mock.allocations.find((a) => a.student_id === Number(student_id) && a.status === 'Active');
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Student already has an active room allocation. Terminate current allocation before re-allocating.',
      });
      return;
    }

    const room = mock.rooms.find((r) => r.room_id === Number(room_id));
    if (!room) {
      res.status(404).json({ success: false, message: 'Target room not found' });
      return;
    }

    if (room.status === 'Maintenance') {
      res.status(400).json({ success: false, message: 'Room is under maintenance' });
      return;
    }

    if (room.current_occupancy >= room.capacity) {
      res.status(400).json({
        success: false,
        message: `Room is already at full capacity (${room.current_occupancy}/${room.capacity})`,
      });
      return;
    }

    const newId = (mock.allocations[mock.allocations.length - 1]?.allocation_id || 0) + 1;
    const newAlloc = {
      allocation_id: newId,
      student_id: Number(student_id),
      room_id: Number(room_id),
      start_date: allocStartDate,
      end_date: null,
      status: 'Active',
      notes: notes || 'Standard allocation',
      created_at: new Date().toISOString(),
    };
    mock.allocations.push(newAlloc);

    room.current_occupancy += 1;
    if (room.current_occupancy >= room.capacity) {
      room.status = 'Full';
    } else {
      room.status = 'Available';
    }

    res.status(201).json({
      success: true,
      message: 'Room allocated to student successfully',
      allocation: newAlloc,
      room,
    });
  } catch (err: any) {
    console.error('allocateRoom error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete room allocation transaction' });
  }
}

export async function terminateAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const allocationId = parseInt(req.params.id, 10);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [allocRows]: any = await connection.query(
          "SELECT allocation_id, room_id, status FROM Allocation WHERE allocation_id = ? AND status = 'Active' FOR UPDATE",
          [allocationId]
        );

        if (allocRows.length === 0) {
          await connection.rollback();
          res.status(404).json({ success: false, message: 'Active allocation record not found' });
          return;
        }

        const alloc = allocRows[0];
        const today = new Date().toISOString().split('T')[0];

        // Update allocation
        await connection.query(
          "UPDATE Allocation SET status = 'Terminated', end_date = ? WHERE allocation_id = ?",
          [today, allocationId]
        );

        // Update room occupancy
        await connection.query(
          "UPDATE Room SET current_occupancy = GREATEST(0, current_occupancy - 1), status = 'Available' WHERE room_id = ?",
          [alloc.room_id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Allocation terminated and room slot freed successfully' });
        return;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    const mock = getMockState();
    const alloc = mock.allocations.find((a) => a.allocation_id === allocationId && a.status === 'Active');
    if (!alloc) {
      res.status(404).json({ success: false, message: 'Active allocation record not found' });
      return;
    }

    alloc.status = 'Terminated';
    alloc.end_date = new Date().toISOString().split('T')[0];

    const room = mock.rooms.find((r) => r.room_id === alloc.room_id);
    if (room) {
      room.current_occupancy = Math.max(0, room.current_occupancy - 1);
      if (room.status !== 'Maintenance') {
        room.status = 'Available';
      }
    }

    res.json({ success: true, message: 'Allocation terminated and room slot freed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error terminating allocation' });
  }
}

// -------------------------------------------------------------
// Fee Management
// -------------------------------------------------------------
export async function getFees(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT 
          f.payment_id, f.student_id, f.amount_paid, f.due_amount, f.payment_date,
          f.payment_method, f.transaction_reference, f.status, f.billing_month, f.remarks, f.created_at,
          s.name AS student_name, s.student_code, s.department
        FROM Fee_Payment f
        JOIN Student s ON f.student_id = s.student_id
      `;
      const params: any[] = [];
      if (query) {
        sql += ' WHERE LOWER(s.name) LIKE ? OR LOWER(s.student_code) LIKE ? OR LOWER(f.transaction_reference) LIKE ?';
        const qp = `%${query}%`;
        params.push(qp, qp, qp);
      }
      sql += ' ORDER BY f.payment_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, fees: rows });
      return;
    }

    const mock = getMockState();
    let fees = mock.fee_payments.map((f) => {
      const s = mock.students.find((st) => st.student_id === f.student_id);
      return {
        ...f,
        student_name: s?.name || 'Unknown',
        student_code: s?.student_code || '',
        department: s?.department || '',
      };
    }).reverse();

    if (query) {
      fees = fees.filter(
        (f) =>
          f.student_name.toLowerCase().includes(query) ||
          f.student_code.toLowerCase().includes(query) ||
          f.transaction_reference.toLowerCase().includes(query)
      );
    }
    res.json({ success: true, fees });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve fee payments' });
  }
}

export async function createFeePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    student_id,
    amount_paid,
    due_amount,
    payment_method,
    transaction_reference,
    billing_month,
    remarks,
  } = req.body;

  if (!student_id || amount_paid === undefined || !payment_method || !transaction_reference || !billing_month) {
    res.status(400).json({ success: false, message: 'Please provide all required payment details' });
    return;
  }

  const status = Number(due_amount) === 0 ? 'Paid' : 'Pending';
  const paymentDate = new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO Fee_Payment 
        (student_id, amount_paid, due_amount, payment_date, payment_method, transaction_reference, status, billing_month, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, amount_paid, due_amount || 0.00, paymentDate, payment_method, transaction_reference, status, billing_month, remarks || '']
      );
      res.status(201).json({ success: true, message: 'Fee payment recorded successfully', payment_id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.fee_payments[mock.fee_payments.length - 1]?.payment_id || 0) + 1;
    const newFee = {
      payment_id: newId,
      student_id: Number(student_id),
      amount_paid: Number(amount_paid),
      due_amount: Number(due_amount) || 0.00,
      payment_date: paymentDate,
      payment_method,
      transaction_reference,
      status,
      billing_month,
      remarks: remarks || '',
      created_at: new Date().toISOString(),
    };
    mock.fee_payments.unshift(newFee);
    res.status(201).json({ success: true, message: 'Fee payment recorded successfully', fee: newFee });
  } catch (err: any) {
    console.error('createFeePayment error:', err);
    res.status(500).json({ success: false, message: 'Failed to record fee payment. Transaction ref must be unique.' });
  }
}

// -------------------------------------------------------------
// Complaints Management
// -------------------------------------------------------------
export async function getComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const sql = `
        SELECT 
          c.complaint_id, c.student_id, c.room_id, c.category, c.title, c.description,
          c.status, c.priority, c.staff_id, c.created_at, c.resolved_at, c.resolution_remarks,
          s.name AS student_name, s.student_code, s.phone AS student_phone,
          r.room_number,
          st.name AS assigned_staff_name, st.role AS assigned_staff_role
        FROM Complaint c
        JOIN Student s ON c.student_id = s.student_id
        LEFT JOIN Room r ON c.room_id = r.room_id
        LEFT JOIN Staff st ON c.staff_id = st.staff_id
        ORDER BY 
          CASE c.status WHEN 'Pending' THEN 1 WHEN 'In Progress' THEN 2 WHEN 'Resolved' THEN 3 ELSE 4 END,
          c.complaint_id DESC
      `;
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, complaints: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.complaints.map((c) => {
      const s = mock.students.find((st) => st.student_id === c.student_id);
      const r = c.room_id ? mock.rooms.find((rm) => rm.room_id === c.room_id) : null;
      const st = c.staff_id ? mock.staff.find((staff) => staff.staff_id === c.staff_id) : null;
      return {
        ...c,
        student_name: s?.name || 'Unknown',
        student_code: s?.student_code || '',
        student_phone: s?.phone || '',
        room_number: r?.room_number || 'N/A',
        assigned_staff_name: st?.name || null,
        assigned_staff_role: st?.role || null,
      };
    });

    res.json({ success: true, complaints: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve complaints' });
  }
}

export async function updateComplaintStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const complaintId = parseInt(req.params.id, 10);
  const { status, staff_id, resolution_remarks } = req.body;
  const dbStatus = getDatabaseStatus();

  try {
    const resolvedAt = status === 'Resolved' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        `UPDATE Complaint 
         SET status = ?, staff_id = COALESCE(?, staff_id), resolution_remarks = ?, resolved_at = ?
         WHERE complaint_id = ?`,
        [status, staff_id || null, resolution_remarks || null, resolvedAt, complaintId]
      );
      res.json({ success: true, message: `Complaint #${complaintId} status updated to ${status}` });
      return;
    }

    const mock = getMockState();
    const complaint = mock.complaints.find((c) => c.complaint_id === complaintId);
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }
    complaint.status = status;
    if (staff_id) complaint.staff_id = Number(staff_id);
    if (resolution_remarks !== undefined) complaint.resolution_remarks = resolution_remarks;
    if (status === 'Resolved') complaint.resolved_at = new Date().toISOString();

    res.json({ success: true, message: `Complaint #${complaintId} status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
}

// -------------------------------------------------------------
// Staff, Maintenance, Mess, and Security Logs
// -------------------------------------------------------------
export async function getStaffList(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT s.staff_id, s.name, s.role, s.phone, s.email, s.shift_timing, s.salary, h.hostel_name
         FROM Staff s
         LEFT JOIN Hostel h ON s.hostel_id = h.hostel_id
         ORDER BY s.staff_id ASC`
      );
      res.json({ success: true, staff: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.staff.map((st) => {
      const h = st.hostel_id ? mock.hostels.find((hst) => hst.hostel_id === st.hostel_id) : null;
      return {
        ...st,
        hostel_name: h?.hostel_name || 'All Hostels',
      };
    });
    res.json({ success: true, staff: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve staff' });
  }
}

export async function getMaintenanceList(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const sql = `
        SELECT 
          m.maintenance_id, m.issue_type, m.description, m.cost, m.status, 
          m.scheduled_date, m.completed_date, m.created_at,
          r.room_number, h.hostel_name,
          st.name AS assigned_staff_name, st.role AS assigned_staff_role
        FROM Maintenance m
        JOIN Hostel h ON m.hostel_id = h.hostel_id
        LEFT JOIN Room r ON m.room_id = r.room_id
        LEFT JOIN Staff st ON m.assigned_staff_id = st.staff_id
        ORDER BY m.maintenance_id DESC
      `;
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, maintenance: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.maintenance.map((m) => {
      const h = mock.hostels.find((hst) => hst.hostel_id === m.hostel_id);
      const r = m.room_id ? mock.rooms.find((rm) => rm.room_id === m.room_id) : null;
      const st = m.assigned_staff_id ? mock.staff.find((s) => s.staff_id === m.assigned_staff_id) : null;
      return {
        ...m,
        hostel_name: h?.hostel_name || 'General',
        room_number: r?.room_number || 'Common Area',
        assigned_staff_name: st?.name || 'Unassigned',
        assigned_staff_role: st?.role || '',
      };
    }).reverse();

    res.json({ success: true, maintenance: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve maintenance records' });
  }
}

export async function createMaintenanceTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_id, room_id, issue_type, description, cost, assigned_staff_id, scheduled_date } = req.body;
  if (!hostel_id || !issue_type || !description) {
    res.status(400).json({ success: false, message: 'Hostel, issue type, and description are required' });
    return;
  }

  const schedDate = scheduled_date || new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO Maintenance (hostel_id, room_id, issue_type, description, cost, assigned_staff_id, status, scheduled_date)
         VALUES (?, ?, ?, ?, ?, ?, 'Reported', ?)`,
        [hostel_id, room_id || null, issue_type, description, cost || 0.00, assigned_staff_id || null, schedDate]
      );
      res.status(201).json({ success: true, message: 'Maintenance ticket created', maintenance_id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.maintenance[mock.maintenance.length - 1]?.maintenance_id || 0) + 1;
    const newMaint = {
      maintenance_id: newId,
      hostel_id: Number(hostel_id),
      room_id: room_id ? Number(room_id) : null,
      issue_type,
      description,
      cost: Number(cost) || 0.00,
      assigned_staff_id: assigned_staff_id ? Number(assigned_staff_id) : null,
      status: 'Reported',
      scheduled_date: schedDate,
      completed_date: null,
      created_at: new Date().toISOString(),
    };
    mock.maintenance.unshift(newMaint);
    res.status(201).json({ success: true, message: 'Maintenance ticket created', maintenance: newMaint });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create maintenance record' });
  }
}

export async function getMessList(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT m.*, h.hostel_name 
         FROM Mess m
         JOIN Hostel h ON m.hostel_id = h.hostel_id
         ORDER BY m.mess_id ASC`
      );
      res.json({ success: true, mess: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.messes.map((m) => {
      const h = mock.hostels.find((hst) => hst.hostel_id === m.hostel_id);
      return {
        ...m,
        hostel_name: h?.hostel_name || 'General Mess',
      };
    });
    res.json({ success: true, mess: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve mess information' });
  }
}
