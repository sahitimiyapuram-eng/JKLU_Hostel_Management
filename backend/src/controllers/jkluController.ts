import { Response } from 'express';
import { getPool, getMockState, getDatabaseStatus } from '../config/db.js';
import { AuthenticatedRequest, resolveEffectiveHostel } from '../middleware/auth.js';

// JKLU Roll Number Regex validator
// Formats: 2025Btech224, 2024BBA015, 2024BDes008, 2023Btech045
export function validateJKLURollNumber(rollNo: string): { isValid: boolean; message?: string } {
  const trimmed = rollNo.trim();
  const jkluRegex = /^20[2-9][0-9](Btech|BBA|BDes|MTech|BCA)[0-9]{3}$/i;
  if (!jkluRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Invalid JKLU Roll Number format. Expected formats: e.g. 2025Btech224, 2024BBA015, or 2024BDes008 (Year + Programme + 3-digit serial).',
    };
  }
  return { isValid: true };
}

// -------------------------------------------------------------
// 1. Dashboard Statistics
// -------------------------------------------------------------
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const isChiefWarden = req.user?.role === 'Chief Warden';
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Execute live MySQL queries with hostel filter if restricted
      let studentSql = 'SELECT COUNT(*) as total FROM Student s JOIN Allocation a ON s.student_id = a.student_id AND a.status = "Active" JOIN Room r ON a.room_id = r.room_id JOIN Hostel h ON r.hostel_id = h.hostel_id';
      let roomSql = 'SELECT COUNT(*) as totalRooms, SUM(current_occupancy) as totalOccupied, SUM(capacity) as totalCapacity FROM Room r JOIN Hostel h ON r.hostel_id = h.hostel_id';
      let complaintSql = 'SELECT COUNT(*) as total FROM register_complaints WHERE status = "Pending"';
      let lateSql = 'SELECT COUNT(*) as total FROM late_night_entry';

      const params: any[] = [];
      if (hostelCode) {
        studentSql += ' WHERE h.hostel_code = ?';
        roomSql += ' WHERE h.hostel_code = ?';
        complaintSql += ' AND hostel_code = ?';
        lateSql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }

      const [[{ total: totalStudents }]]: any = await pool.query(studentSql, hostelCode ? [hostelCode] : []);
      const [[{ totalRooms, totalOccupied, totalCapacity }]]: any = await pool.query(roomSql, hostelCode ? [hostelCode] : []);
      const [[{ total: pendingComplaints }]]: any = await pool.query(complaintSql, hostelCode ? [hostelCode] : []);
      const [[{ total: lateEntries }]]: any = await pool.query(lateSql, hostelCode ? [hostelCode] : []);

      // If Chief Warden, gather hostel-wise comparison
      let hostelBreakdown: any[] = [];
      if (isChiefWarden) {
        const [breakdownRows]: any = await pool.query(`
          SELECT 
            h.hostel_code, h.hostel_name, h.gender,
            COUNT(DISTINCT r.room_id) as roomsCount,
            COALESCE(SUM(r.capacity), 0) as capacity,
            COALESCE(SUM(r.current_occupancy), 0) as occupied,
            (SELECT COUNT(*) FROM register_complaints c WHERE c.hostel_code = h.hostel_code AND c.status = 'Pending') as pendingComplaints,
            (SELECT COUNT(*) FROM late_night_entry l WHERE l.hostel_code = h.hostel_code) as lateEntries,
            (SELECT COUNT(*) FROM cleaning_register cl WHERE cl.hostel_code = h.hostel_code AND cl.inspection_status = 'Satisfactory') as cleanedAreas
          FROM Hostel h
          LEFT JOIN Room r ON h.hostel_id = r.hostel_id
          GROUP BY h.hostel_id
          ORDER BY h.hostel_code
        `);
        hostelBreakdown = breakdownRows;
      }

      res.json({
        success: true,
        hostelFilter: hostelCode,
        isChiefWarden,
        stats: {
          totalStudents: Number(totalStudents) || 0,
          totalRooms: Number(totalRooms) || 0,
          totalCapacity: Number(totalCapacity) || 0,
          totalOccupied: Number(totalOccupied) || 0,
          vacantBeds: Math.max(0, (Number(totalCapacity) || 0) - (Number(totalOccupied) || 0)),
          pendingComplaints: Number(pendingComplaints) || 0,
          lateEntries: Number(lateEntries) || 0,
        },
        hostelBreakdown,
      });
      return;
    }

    // In-Memory Simulation
    const mock = getMockState();
    let relevantStudents = mock.students;
    let relevantRooms = mock.rooms;
    let relevantComplaints = mock.register_complaints;
    let relevantLate = mock.late_night_entry;

    if (hostelCode) {
      relevantStudents = mock.students.filter((s) => s.hostel_code === hostelCode);
      relevantRooms = mock.rooms.filter((r) => r.hostel_code === hostelCode);
      relevantComplaints = mock.register_complaints.filter((c) => c.hostel_code === hostelCode);
      relevantLate = mock.late_night_entry.filter((l) => l.hostel_code === hostelCode);
    }

    const totalCapacity = relevantRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const totalOccupied = relevantRooms.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);

    const hostelBreakdown = mock.hostels.map((h) => {
      const hRooms = mock.rooms.filter((r) => r.hostel_code === h.hostel_code);
      const cap = hRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
      const occ = hRooms.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
      const pendingC = mock.register_complaints.filter((c) => c.hostel_code === h.hostel_code && c.status === 'Pending').length;
      const lateC = mock.late_night_entry.filter((l) => l.hostel_code === h.hostel_code).length;
      const cleaned = mock.cleaning_register.filter((cl) => cl.hostel_code === h.hostel_code && cl.inspection_status === 'Satisfactory').length;

      return {
        hostel_code: h.hostel_code,
        hostel_name: h.hostel_name,
        gender: h.gender,
        roomsCount: hRooms.length,
        capacity: cap,
        occupied: occ,
        pendingComplaints: pendingC,
        lateEntries: lateC,
        cleanedAreas: cleaned,
      };
    });

    res.json({
      success: true,
      hostelFilter: hostelCode,
      isChiefWarden,
      stats: {
        totalStudents: relevantStudents.length,
        totalRooms: relevantRooms.length,
        totalCapacity,
        totalOccupied,
        vacantBeds: Math.max(0, totalCapacity - totalOccupied),
        pendingComplaints: relevantComplaints.filter((c) => c.status === 'Pending').length,
        lateEntries: relevantLate.length,
      },
      hostelBreakdown: isChiefWarden ? hostelBreakdown : [],
    });
  } catch (err: any) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard stats' });
  }
}

// -------------------------------------------------------------
// 2. Students & Roll Number Validation
// -------------------------------------------------------------
export async function getStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const search = (req.query.q as string || '').toLowerCase().trim();
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT s.student_id, s.student_code, s.name, s.email, s.phone, s.emergency_contact,
               s.department, s.programme, s.year_of_study, s.gender, s.blood_group,
               h.hostel_code, h.hostel_name, r.room_number, a.allocation_id
        FROM Student s
        LEFT JOIN Allocation a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN Room r ON a.room_id = r.room_id
        LEFT JOIN Hostel h ON r.hostel_id = h.hostel_id
      `;
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (hostelCode) {
        whereClauses.push('h.hostel_code = ?');
        params.push(hostelCode);
      }
      if (search) {
        whereClauses.push('(LOWER(s.name) LIKE ? OR LOWER(s.student_code) LIKE ? OR LOWER(s.department) LIKE ?)');
        const qp = `%${search}%`;
        params.push(qp, qp, qp);
      }

      if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
      }
      sql += ' ORDER BY s.student_id ASC';

      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, students: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.students.map((s) => ({
      ...s,
      roll_no: s.student_code,
    }));

    if (hostelCode) {
      list = list.filter((s) => s.hostel_code === hostelCode);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          (s.student_code && s.student_code.toLowerCase().includes(search)) ||
          s.department.toLowerCase().includes(search)
      );
    }

    res.json({ success: true, students: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student records' });
  }
}

export async function updateStudentRollNumber(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = parseInt(req.params.id, 10);
  const { student_code } = req.body;

  if (!student_code) {
    res.status(400).json({ success: false, message: 'Please provide a student roll number' });
    return;
  }

  const validation = validateJKLURollNumber(student_code);
  if (!validation.isValid) {
    res.status(400).json({ success: false, message: validation.message });
    return;
  }

  const formattedRollNo = student_code.trim();
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query('UPDATE Student SET student_code = ? WHERE student_id = ?', [formattedRollNo, studentId]);
      res.json({ success: true, message: `Roll number updated to ${formattedRollNo} successfully` });
      return;
    }

    const mock = getMockState();
    const student = mock.students.find((s) => s.student_id === studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }
    student.student_code = formattedRollNo;
    res.json({ success: true, message: `Roll number updated to ${formattedRollNo} successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Database error while updating roll number' });
  }
}

// -------------------------------------------------------------
// 3. Rooms
// -------------------------------------------------------------
export async function getRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT r.room_id, r.room_number, r.floor_number, r.capacity, r.current_occupancy, r.status, r.monthly_fee,
               h.hostel_code, h.hostel_name, h.gender
        FROM Room r
        JOIN Hostel h ON r.hostel_id = h.hostel_id
      `;
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE h.hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY h.hostel_code, r.floor_number, r.room_number';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, rooms: rows });
      return;
    }

    const mock = getMockState();
    let rooms = mock.rooms;
    if (hostelCode) {
      rooms = rooms.filter((r) => r.hostel_code === hostelCode);
    }
    res.json({ success: true, rooms });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rooms' });
  }
}

// -------------------------------------------------------------
// 4. Register: Complaints (register_complaints)
// -------------------------------------------------------------
export async function getRegisterComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM register_complaints';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, complaints: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.register_complaints;
    if (hostelCode) {
      list = list.filter((c) => c.hostel_code === hostelCode);
    }
    res.json({ success: true, complaints: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get register complaints' });
  }
}

export async function addRegisterComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.body.hostel_code);
  const { complaint_date, student_name, student_roll_no, hostel_code, room_no, complaint_type, complaint_details } = req.body;

  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;
  if (!targetHostel || !student_name || !room_no || !complaint_type || !complaint_details) {
    res.status(400).json({ success: false, message: 'Please provide all required complaint details' });
    return;
  }

  const cDate = complaint_date || new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO register_complaints 
         (complaint_date, student_name, student_roll_no, hostel_code, room_no, complaint_type, complaint_details, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [cDate, student_name, student_roll_no || null, targetHostel, room_no, complaint_type, complaint_details]
      );
      res.status(201).json({ success: true, message: 'Complaint registered successfully', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.register_complaints[mock.register_complaints.length - 1]?.id || 0) + 1;
    const item = {
      id: newId,
      complaint_date: cDate,
      student_name,
      student_roll_no: student_roll_no || null,
      hostel_code: targetHostel,
      room_no,
      complaint_type,
      complaint_details,
      status: 'Pending',
      resolved_date: null,
      action_taken: null,
    };
    mock.register_complaints.push(item);
    res.status(201).json({ success: true, message: 'Complaint registered successfully', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record complaint in register' });
  }
}

export async function updateRegisterComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);
  const { status, action_taken } = req.body;
  const resolvedDate = status === 'Resolved' ? new Date().toISOString().split('T')[0] : null;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        'UPDATE register_complaints SET status = ?, action_taken = ?, resolved_date = ? WHERE id = ?',
        [status, action_taken || null, resolvedDate, id]
      );
      res.json({ success: true, message: `Complaint #${id} updated to ${status}` });
      return;
    }

    const mock = getMockState();
    const complaint = mock.register_complaints.find((c) => c.id === id);
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }
    complaint.status = status;
    complaint.action_taken = action_taken || complaint.action_taken;
    if (resolvedDate) complaint.resolved_date = resolvedDate;
    res.json({ success: true, message: `Complaint #${id} updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
}

// -------------------------------------------------------------
// 5. Register: Cleaning (cleaning_register)
// -------------------------------------------------------------
export async function getCleaningRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM cleaning_register';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY cleaning_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.cleaning_register;
    if (hostelCode) {
      list = list.filter((c) => c.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get cleaning register' });
  }
}

export async function addCleaningEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_code, floor_or_area, cleaner_name, cleaning_date, cleaning_time, inspection_status, remarks } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !floor_or_area || !cleaner_name) {
    res.status(400).json({ success: false, message: 'Please provide hostel, area, and cleaner name' });
    return;
  }

  const inspector = req.user?.name || 'Duty Warden';
  const cDate = cleaning_date || new Date().toISOString().split('T')[0];
  const cTime = cleaning_time || '09:00:00';
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO cleaning_register 
         (hostel_code, floor_or_area, cleaner_name, cleaning_date, cleaning_time, inspection_status, remarks, inspected_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [targetHostel, floor_or_area, cleaner_name, cDate, cTime, inspection_status || 'Satisfactory', remarks || null, inspector]
      );
      res.status(201).json({ success: true, message: 'Cleaning inspection recorded', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.cleaning_register[mock.cleaning_register.length - 1]?.cleaning_id || 0) + 1;
    const item = {
      cleaning_id: newId,
      hostel_code: targetHostel,
      floor_or_area,
      cleaner_name,
      cleaning_date: cDate,
      cleaning_time: cTime,
      inspection_status: inspection_status || 'Satisfactory',
      remarks: remarks || null,
      inspected_by: inspector,
    };
    mock.cleaning_register.push(item);
    res.status(201).json({ success: true, message: 'Cleaning inspection recorded', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record cleaning entry' });
  }
}

// -------------------------------------------------------------
// 6. Register: Student Out Register (student_out_register)
// -------------------------------------------------------------
export async function getStudentOutRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM student_out_register';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY out_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.student_out_register;
    if (hostelCode) {
      list = list.filter((r) => r.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get student out register' });
  }
}

export async function addStudentOutEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { student_name, roll_no, hostel_code, room_no, destination, expected_in_date, expected_in_time, contact_number, remarks } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !student_name || !room_no || !destination || !contact_number) {
    res.status(400).json({ success: false, message: 'Please provide all required out-pass details' });
    return;
  }

  const outDate = new Date().toISOString().split('T')[0];
  const outTime = new Date().toTimeString().split(' ')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO student_out_register 
         (student_name, roll_no, hostel_code, room_no, destination, out_date, out_time, expected_in_date, expected_in_time, contact_number, parent_consent_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)`,
        [student_name, roll_no || null, targetHostel, room_no, destination, outDate, outTime, expected_in_date || outDate, expected_in_time || '20:00:00', contact_number, remarks || null]
      );
      res.status(201).json({ success: true, message: 'Out-pass logged successfully', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.student_out_register[mock.student_out_register.length - 1]?.out_id || 0) + 1;
    const item = {
      out_id: newId,
      student_name,
      roll_no: roll_no || null,
      hostel_code: targetHostel,
      room_no,
      destination,
      out_date: outDate,
      out_time: outTime,
      expected_in_date: expected_in_date || outDate,
      expected_in_time: expected_in_time || '20:00:00',
      actual_in_date: null,
      actual_in_time: null,
      contact_number,
      parent_consent_status: 'Approved',
      remarks: remarks || null,
    };
    mock.student_out_register.push(item);
    res.status(201).json({ success: true, message: 'Out-pass logged successfully', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to log student out-pass' });
  }
}

export async function markStudentReturned(req: AuthenticatedRequest, res: Response): Promise<void> {
  const outId = parseInt(req.params.id, 10);
  const inDate = new Date().toISOString().split('T')[0];
  const inTime = new Date().toTimeString().split(' ')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        'UPDATE student_out_register SET actual_in_date = ?, actual_in_time = ? WHERE out_id = ?',
        [inDate, inTime, outId]
      );
      res.json({ success: true, message: 'Student return marked successfully' });
      return;
    }

    const mock = getMockState();
    const item = mock.student_out_register.find((r) => r.out_id === outId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Out-pass record not found' });
      return;
    }
    item.actual_in_date = inDate;
    item.actual_in_time = inTime;
    res.json({ success: true, message: 'Student return marked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to mark return' });
  }
}

// -------------------------------------------------------------
// 7. Register: Late-Night Entry (late_night_entry)
// -------------------------------------------------------------
export async function getLateNightEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM late_night_entry';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY entry_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.late_night_entry;
    if (hostelCode) {
      list = list.filter((l) => l.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve late night entries' });
  }
}

export async function addLateNightEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { student_name, roll_no, hostel_code, room_no, entry_date, entry_time, reason_for_late, guard_on_duty, action_or_remarks } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !student_name || !room_no || !reason_for_late) {
    res.status(400).json({ success: false, message: 'Please provide student name, room, and reason for late arrival' });
    return;
  }

  const eDate = entry_date || new Date().toISOString().split('T')[0];
  const eTime = entry_time || new Date().toTimeString().split(' ')[0];
  const guard = guard_on_duty || 'Main Gate Security Guard';
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO late_night_entry 
         (student_name, roll_no, hostel_code, room_no, entry_date, entry_time, reason_for_late, guard_on_duty, warden_notified, action_or_remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [student_name, roll_no || null, targetHostel, room_no, eDate, eTime, reason_for_late, guard, action_or_remarks || 'Late night log recorded']
      );
      res.status(201).json({ success: true, message: 'Late night entry registered', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.late_night_entry[mock.late_night_entry.length - 1]?.entry_id || 0) + 1;
    const item = {
      entry_id: newId,
      student_name,
      roll_no: roll_no || null,
      hostel_code: targetHostel,
      room_no,
      entry_date: eDate,
      entry_time: eTime,
      reason_for_late,
      guard_on_duty: guard,
      warden_notified: true,
      action_or_remarks: action_or_remarks || 'Late night log recorded',
    };
    mock.late_night_entry.push(item);
    res.status(201).json({ success: true, message: 'Late night entry registered', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record late night entry' });
  }
}

// -------------------------------------------------------------
// 8. Register: Attendance (attendance_register)
// -------------------------------------------------------------
export async function getAttendanceRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const date = req.query.date as string | undefined;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM attendance_register';
      const params: any[] = [];
      const conditions: string[] = [];

      if (date) {
        conditions.push('date = ?');
        params.push(date);
      }
      if (hostelCode) {
        conditions.push('hostel_code = ?');
        params.push(hostelCode);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY date DESC, room_no ASC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows, date: date || null });
      return;
    }

    const mock = getMockState();
    let list = mock.attendance_register;
    if (date) {
      list = list.filter((a) => a.date === date);
    }
    if (hostelCode) {
      list = list.filter((a) => a.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse(), date: date || null });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get attendance register' });
  }
}

export async function addAttendanceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { student_name, roll_no, hostel_code, room_no, date, status, remarks } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !student_name || !room_no) {
    res.status(400).json({ success: false, message: 'Please provide student name, hostel, and room' });
    return;
  }

  const aDate = date || new Date().toISOString().split('T')[0];
  const recorder = req.user?.name || 'Hostel Warden';
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO attendance_register 
         (student_name, roll_no, hostel_code, room_no, date, status, remarks, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`,
        [student_name, roll_no || null, targetHostel, room_no, aDate, status || 'Present', remarks || null, recorder]
      );
      res.status(201).json({ success: true, message: 'Attendance recorded successfully' });
      return;
    }

    const mock = getMockState();
    const existing = mock.attendance_register.find(
      (a) => a.roll_no === roll_no && a.date === aDate && roll_no !== null
    );

    if (existing) {
      existing.status = status || 'Present';
      existing.remarks = remarks || null;
      res.json({ success: true, message: 'Attendance updated' });
      return;
    }

    const newId = (mock.attendance_register[mock.attendance_register.length - 1]?.attendance_id || 0) + 1;
    mock.attendance_register.push({
      attendance_id: newId,
      student_id: null,
      student_name,
      roll_no: roll_no || null,
      hostel_code: targetHostel,
      room_no,
      date: aDate,
      status: status || 'Present',
      remarks: remarks || null,
      recorded_by: recorder,
    });
    res.status(201).json({ success: true, message: 'Attendance recorded successfully', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
}

// -------------------------------------------------------------
// 9. Register: Maintenance (maintenance_register)
// -------------------------------------------------------------
export async function getMaintenanceRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM maintenance_register';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY maint_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.maintenance_register;
    if (hostelCode) {
      list = list.filter((m) => m.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get maintenance register' });
  }
}

export async function addMaintenanceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_code, location_or_room, issue_description, work_type, reported_date, assigned_worker, cost } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !location_or_room || !issue_description || !work_type) {
    res.status(400).json({ success: false, message: 'Please provide hostel, location, description, and work type' });
    return;
  }

  const rDate = reported_date || new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO maintenance_register 
         (hostel_code, location_or_room, issue_description, work_type, reported_date, assigned_worker, completion_status, cost)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [targetHostel, location_or_room, issue_description, work_type, rDate, assigned_worker || null, cost || 0.00]
      );
      res.status(201).json({ success: true, message: 'Maintenance job recorded', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.maintenance_register[mock.maintenance_register.length - 1]?.maint_id || 0) + 1;
    const item = {
      maint_id: newId,
      hostel_code: targetHostel,
      location_or_room,
      issue_description,
      work_type,
      reported_date: rDate,
      assigned_worker: assigned_worker || null,
      completion_status: 'Pending',
      completed_date: null,
      cost: Number(cost) || 0.00,
    };
    mock.maintenance_register.push(item);
    res.status(201).json({ success: true, message: 'Maintenance job recorded', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record maintenance ticket' });
  }
}

export async function completeMaintenanceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const maintId = parseInt(req.params.id, 10);
  const completedDate = new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        'UPDATE maintenance_register SET completion_status = "Completed", completed_date = ? WHERE maint_id = ?',
        [completedDate, maintId]
      );
      res.json({ success: true, message: 'Maintenance job marked as completed' });
      return;
    }

    const mock = getMockState();
    const item = mock.maintenance_register.find((m) => m.maint_id === maintId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Maintenance record not found' });
      return;
    }
    item.completion_status = 'Completed';
    item.completed_date = completedDate;
    res.json({ success: true, message: 'Maintenance job marked as completed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update maintenance record' });
  }
}

// -------------------------------------------------------------
// 10. Register: Security Handover (security_handover)
// -------------------------------------------------------------
export async function getSecurityHandover(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostelCode } = resolveEffectiveHostel(req, req.query.hostel as string);
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = 'SELECT * FROM security_handover';
      const params: any[] = [];
      if (hostelCode) {
        sql += ' WHERE hostel_code = ?';
        params.push(hostelCode);
      }
      sql += ' ORDER BY handover_id DESC';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, records: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.security_handover;
    if (hostelCode) {
      list = list.filter((h) => h.hostel_code === hostelCode);
    }
    res.json({ success: true, records: [...list].reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get security handover log' });
  }
}

export async function addSecurityHandover(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { hostel_code, handover_date, shift, outgoing_guard, incoming_guard, keys_status, incident_summary } = req.body;
  const targetHostel = req.user?.role === 'Warden' ? req.user.assigned_hostel : hostel_code;

  if (!targetHostel || !shift || !outgoing_guard || !incoming_guard) {
    res.status(400).json({ success: false, message: 'Please provide shift, outgoing guard, and incoming guard' });
    return;
  }

  const hDate = handover_date || new Date().toISOString().split('T')[0];
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO security_handover 
         (hostel_code, handover_date, shift, outgoing_guard, incoming_guard, keys_status, incident_summary, verified_by_warden)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [targetHostel, hDate, shift, outgoing_guard, incoming_guard, keys_status || 'All keys accounted for', incident_summary || 'Shift completed without incidents']
      );
      res.status(201).json({ success: true, message: 'Security handover registered', id: result.insertId });
      return;
    }

    const mock = getMockState();
    const newId = (mock.security_handover[mock.security_handover.length - 1]?.handover_id || 0) + 1;
    const item = {
      handover_id: newId,
      hostel_code: targetHostel,
      handover_date: hDate,
      shift,
      outgoing_guard,
      incoming_guard,
      keys_status: keys_status || 'All keys accounted for',
      incident_summary: incident_summary || 'Shift completed without incidents',
      verified_by_warden: true,
    };
    mock.security_handover.push(item);
    res.status(201).json({ success: true, message: 'Security handover registered', id: newId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record security handover' });
  }
}

// -------------------------------------------------------------
// 11. Mess: Weekly Menu Timetable & Editable Configuration
// -------------------------------------------------------------
export async function getMessMenu(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM Mess_Weekly_Menu ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"), FIELD(meal_type, "Breakfast", "Lunch", "Evening Snacks", "Dinner")');
      res.json({ success: true, menu: rows });
      return;
    }

    const mock = getMockState();
    res.json({ success: true, menu: mock.mess_menu_config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve mess menu' });
  }
}

export async function updateMessMenu(req: AuthenticatedRequest, res: Response): Promise<void> {
  const menuId = parseInt(req.params.id, 10);
  const { menu_items, meal_timing } = req.body;
  const updatedBy = req.user?.name || 'Authorized Warden';
  const isConfigured = Boolean(menu_items && menu_items.trim());
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        'UPDATE Mess_Weekly_Menu SET menu_items = ?, meal_timing = ?, is_configured = ?, last_updated_by = ? WHERE menu_id = ?',
        [menu_items || null, meal_timing || null, isConfigured, updatedBy, menuId]
      );
      res.json({ success: true, message: 'Mess menu timetable entry updated' });
      return;
    }

    const mock = getMockState();
    const item = mock.mess_menu_config.find((m) => m.menu_id === menuId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu slot not found' });
      return;
    }
    item.menu_items = menu_items ? menu_items.trim() : null;
    item.meal_timing = meal_timing ? meal_timing.trim() : null;
    item.is_configured = isConfigured;
    item.last_updated_by = updatedBy;
    item.updated_at = new Date().toISOString();

    res.json({ success: true, message: 'Mess menu timetable entry updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update mess configuration' });
  }
}
