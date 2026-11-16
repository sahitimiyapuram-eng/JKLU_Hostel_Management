import { Response } from 'express';
import { getPool, getMockState, getDatabaseStatus } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// -------------------------------------------------------------
// Student Profile & Room Details
// -------------------------------------------------------------
export async function getStudentProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT student_id, student_code, name, email, phone, emergency_contact, department, year_of_study, gender, blood_group, created_at
         FROM Student WHERE student_id = ?`,
        [studentId]
      );
      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'Student record not found' });
        return;
      }
      res.json({ success: true, profile: rows[0] });
      return;
    }

    const mock = getMockState();
    const student = mock.students.find((s) => s.student_id === studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }
    const { password_hash, plain_password, ...profile } = student;
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student profile' });
  }
}

export async function getStudentRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Find active allocation
      const [allocRows]: any = await pool.query(
        `SELECT a.allocation_id, a.start_date, a.notes,
                r.room_id, r.room_number, r.floor_number, r.capacity, r.current_occupancy, r.monthly_fee,
                h.hostel_id, h.hostel_name, h.gender AS hostel_gender, h.address AS hostel_address,
                w.name AS warden_name, w.phone AS warden_phone, w.office_location AS warden_office
         FROM Allocation a
         JOIN Room r ON a.room_id = r.room_id
         JOIN Hostel h ON r.hostel_id = h.hostel_id
         LEFT JOIN Warden w ON h.warden_id = w.warden_id
         WHERE a.student_id = ? AND a.status = 'Active'
         LIMIT 1`,
        [studentId]
      );

      if (allocRows.length === 0) {
        res.json({ success: true, room: null, message: 'No active room allocation assigned yet' });
        return;
      }

      const roomData = allocRows[0];

      // Roommates in the same room (excluding current student)
      const [roommates]: any = await pool.query(
        `SELECT s.student_id, s.name, s.student_code, s.department, s.year_of_study, s.phone
         FROM Allocation a
         JOIN Student s ON a.student_id = s.student_id
         WHERE a.room_id = ? AND a.status = 'Active' AND a.student_id != ?`,
        [roomData.room_id, studentId]
      );

      res.json({
        success: true,
        room: {
          ...roomData,
          roommates,
        },
      });
      return;
    }

    const mock = getMockState();
    const alloc = mock.allocations.find((a) => a.student_id === studentId && a.status === 'Active');
    if (!alloc) {
      res.json({ success: true, room: null, message: 'No active room allocation assigned yet' });
      return;
    }

    const room = mock.rooms.find((r) => r.room_id === alloc.room_id);
    const hostel = room ? mock.hostels.find((h) => h.hostel_id === room.hostel_id) : null;
    const warden = hostel ? mock.wardens.find((w) => w.warden_id === hostel.warden_id) : null;

    const roommates = mock.allocations
      .filter((a) => a.room_id === alloc.room_id && a.status === 'Active' && a.student_id !== studentId)
      .map((a) => {
        const s = mock.students.find((st) => st.student_id === a.student_id);
        return {
          student_id: s?.student_id,
          name: s?.name,
          student_code: s?.student_code,
          department: s?.department,
          year_of_study: s?.year_of_study,
          phone: s?.phone,
        };
      });

    res.json({
      success: true,
      room: {
        allocation_id: alloc.allocation_id,
        start_date: alloc.start_date,
        notes: alloc.notes,
        room_id: room?.room_id,
        room_number: room?.room_number,
        floor_number: room?.floor_number,
        capacity: room?.capacity,
        current_occupancy: room?.current_occupancy,
        monthly_fee: room?.monthly_fee,
        hostel_id: hostel?.hostel_id,
        hostel_name: hostel?.hostel_name,
        hostel_gender: hostel?.gender,
        hostel_address: hostel?.address,
        warden_name: warden?.name,
        warden_phone: warden?.phone,
        warden_office: warden?.office_location,
        roommates,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve room details' });
  }
}

// -------------------------------------------------------------
// Student Fees
// -------------------------------------------------------------
export async function getStudentFees(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT payment_id, amount_paid, due_amount, payment_date, payment_method,
                transaction_reference, status, billing_month, remarks, created_at
         FROM Fee_Payment
         WHERE student_id = ?
         ORDER BY payment_id DESC`,
        [studentId]
      );

      const totalPaid = rows.reduce((acc: number, r: any) => acc + Number(r.amount_paid || 0), 0);
      const totalDue = rows.reduce((acc: number, r: any) => acc + Number(r.due_amount || 0), 0);

      res.json({
        success: true,
        fees: rows,
        summary: {
          totalPaid,
          totalDue,
          hasOutstandingDues: totalDue > 0,
        },
      });
      return;
    }

    const mock = getMockState();
    const payments = mock.fee_payments
      .filter((f) => f.student_id === studentId)
      .reverse();

    const totalPaid = payments.reduce((acc, f) => acc + Number(f.amount_paid || 0), 0);
    const totalDue = payments.reduce((acc, f) => acc + Number(f.due_amount || 0), 0);

    res.json({
      success: true,
      fees: payments,
      summary: {
        totalPaid,
        totalDue,
        hasOutstandingDues: totalDue > 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve fee records' });
  }
}

// -------------------------------------------------------------
// Student Complaints (File & Track)
// -------------------------------------------------------------
export async function getStudentComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT c.complaint_id, c.category, c.title, c.description, c.status, c.priority,
                c.created_at, c.resolved_at, c.resolution_remarks,
                r.room_number,
                st.name AS assigned_staff_name
         FROM Complaint c
         LEFT JOIN Room r ON c.room_id = r.room_id
         LEFT JOIN Staff st ON c.staff_id = st.staff_id
         WHERE c.student_id = ?
         ORDER BY c.complaint_id DESC`,
        [studentId]
      );
      res.json({ success: true, complaints: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.complaints
      .filter((c) => c.student_id === studentId)
      .map((c) => {
        const r = c.room_id ? mock.rooms.find((rm) => rm.room_id === c.room_id) : null;
        const st = c.staff_id ? mock.staff.find((s) => s.staff_id === c.staff_id) : null;
        return {
          ...c,
          room_number: r?.room_number || 'General',
          assigned_staff_name: st?.name || null,
        };
      })
      .reverse();

    res.json({ success: true, complaints: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student complaints' });
  }
}

export async function createStudentComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const { category, title, description, priority } = req.body;

  if (!category || !title || !description) {
    res.status(400).json({ success: false, message: 'Please provide category, title, and detailed description' });
    return;
  }

  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Find student's current room if allocated
      const [alloc]: any = await pool.query(
        "SELECT room_id FROM Allocation WHERE student_id = ? AND status = 'Active' LIMIT 1",
        [studentId]
      );
      const roomId = alloc.length > 0 ? alloc[0].room_id : null;

      const [result]: any = await pool.query(
        `INSERT INTO Complaint (student_id, room_id, category, title, description, status, priority)
         VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
        [studentId, roomId, category, title, description, priority || 'Medium']
      );

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully to hostel administration',
        complaint_id: result.insertId,
      });
      return;
    }

    const mock = getMockState();
    const alloc = mock.allocations.find((a) => a.student_id === studentId && a.status === 'Active');
    const roomId = alloc ? alloc.room_id : null;
    const newId = (mock.complaints[mock.complaints.length - 1]?.complaint_id || 0) + 1;

    const newComplaint = {
      complaint_id: newId,
      student_id: studentId,
      room_id: roomId,
      category,
      title,
      description,
      status: 'Pending',
      priority: priority || 'Medium',
      staff_id: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
      resolution_remarks: null,
    };
    mock.complaints.unshift(newComplaint);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully to hostel administration',
      complaint: newComplaint,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit complaint' });
  }
}

// -------------------------------------------------------------
// Student Mess, Visitors, and Security Logs
// -------------------------------------------------------------
export async function getStudentMess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Get student's hostel mess or default mess
      const [alloc]: any = await pool.query(
        `SELECT r.hostel_id FROM Allocation a JOIN Room r ON a.room_id = r.room_id WHERE a.student_id = ? AND a.status = 'Active'`,
        [studentId]
      );
      const hostelId = alloc.length > 0 ? alloc[0].hostel_id : null;

      let sql = 'SELECT m.*, h.hostel_name FROM Mess m JOIN Hostel h ON m.hostel_id = h.hostel_id';
      const params: any[] = [];
      if (hostelId) {
        sql += ' WHERE m.hostel_id = ?';
        params.push(hostelId);
      }
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, mess: rows });
      return;
    }

    const mock = getMockState();
    const alloc = mock.allocations.find((a) => a.student_id === studentId && a.status === 'Active');
    let hostelId: number | null = null;
    if (alloc) {
      const r = mock.rooms.find((rm) => rm.room_id === alloc.room_id);
      if (r) hostelId = r.hostel_id;
    }

    let list = mock.messes.map((m) => {
      const h = mock.hostels.find((hst) => hst.hostel_id === m.hostel_id);
      return {
        ...m,
        hostel_name: h?.hostel_name || 'Hostel Mess',
      };
    });

    if (hostelId) {
      list = list.filter((m) => m.hostel_id === hostelId);
    }

    res.json({ success: true, mess: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get mess details' });
  }
}

export async function getStudentVisitors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT v.visit_id, v.relation_to_student, v.purpose, v.check_in, v.check_out, v.status, v.guard_name,
                vis.full_name AS visitor_name, vis.phone AS visitor_phone, vis.id_proof_type,
                h.hostel_name
         FROM Visit v
         JOIN Visitor vis ON v.visitor_id = vis.visitor_id
         JOIN Hostel h ON v.hostel_id = h.hostel_id
         WHERE v.student_id = ?
         ORDER BY v.visit_id DESC`,
        [studentId]
      );
      res.json({ success: true, visitors: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.visits
      .filter((v) => v.student_id === studentId)
      .map((v) => {
        const vis = mock.visitors.find((vt) => vt.visitor_id === v.visitor_id);
        const h = mock.hostels.find((hst) => hst.hostel_id === v.hostel_id);
        return {
          ...v,
          visitor_name: vis?.full_name || 'Guest',
          visitor_phone: vis?.phone || '',
          id_proof_type: vis?.id_proof_type || '',
          hostel_name: h?.hostel_name || '',
        };
      })
      .reverse();

    res.json({ success: true, visitors: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve visitors' });
  }
}

export async function getStudentSecurityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.user!.id;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT log_id, event_type, event_time, is_late_entry, destination, reason, logged_by, created_at
         FROM Security_Log
         WHERE student_id = ?
         ORDER BY log_id DESC`,
        [studentId]
      );
      res.json({ success: true, logs: rows });
      return;
    }

    const mock = getMockState();
    const logs = mock.security_logs
      .filter((l) => l.student_id === studentId)
      .reverse();

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve security logs' });
  }
}
