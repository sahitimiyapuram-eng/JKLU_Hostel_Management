import { Response } from 'express';
import { getPool, getMockState, getDatabaseStatus } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// -------------------------------------------------------------
// Guard: Student Search & Verification
// -------------------------------------------------------------
export async function searchStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT 
          s.student_id, s.student_code, s.name, s.department, s.year_of_study, 
          s.phone, s.emergency_contact, s.blood_group,
          r.room_number, h.hostel_name, h.hostel_id
        FROM Student s
        LEFT JOIN Allocation a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN Room r ON a.room_id = r.room_id
        LEFT JOIN Hostel h ON r.hostel_id = h.hostel_id
      `;
      const params: any[] = [];
      if (query) {
        sql += ' WHERE LOWER(s.name) LIKE ? OR LOWER(s.student_code) LIKE ? OR LOWER(s.phone) LIKE ?';
        const qp = `%${query}%`;
        params.push(qp, qp, qp);
      }
      sql += ' ORDER BY s.name ASC LIMIT 50';
      const [rows]: any = await pool.query(sql, params);
      res.json({ success: true, students: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.students.map((s) => {
      const alloc = mock.allocations.find((a) => a.student_id === s.student_id && a.status === 'Active');
      let room_number = 'Not Allotted';
      let hostel_name = 'Unassigned';
      let hostel_id = null;
      if (alloc) {
        const room = mock.rooms.find((r) => r.room_id === alloc.room_id);
        if (room) {
          room_number = room.room_number;
          const hostel = mock.hostels.find((h) => h.hostel_id === room.hostel_id);
          if (hostel) {
            hostel_name = hostel.hostel_name;
            hostel_id = hostel.hostel_id;
          }
        }
      }
      return {
        student_id: s.student_id,
        student_code: s.student_code,
        name: s.name,
        department: s.department,
        year_of_study: s.year_of_study,
        phone: s.phone,
        emergency_contact: s.emergency_contact,
        blood_group: s.blood_group,
        room_number,
        hostel_name,
        hostel_id,
      };
    });

    if (query) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.student_code.toLowerCase().includes(query) ||
          s.phone.includes(query)
      );
    }

    res.json({ success: true, students: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to search students' });
  }
}

// -------------------------------------------------------------
// Guard: Visitor Management
// -------------------------------------------------------------
export async function getVisitors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const insideOnly = req.query.inside === 'true';
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      let sql = `
        SELECT 
          v.visit_id, v.visitor_id, v.student_id, v.hostel_id, v.relation_to_student,
          v.purpose, v.check_in, v.check_out, v.status, v.guard_name, v.created_at,
          vis.full_name AS visitor_name, vis.phone AS visitor_phone, 
          vis.id_proof_type, vis.id_proof_number, vis.address AS visitor_address,
          s.name AS student_name, s.student_code,
          r.room_number, h.hostel_name
        FROM Visit v
        JOIN Visitor vis ON v.visitor_id = vis.visitor_id
        JOIN Student s ON v.student_id = s.student_id
        JOIN Hostel h ON v.hostel_id = h.hostel_id
        LEFT JOIN Allocation a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN Room r ON a.room_id = r.room_id
      `;
      if (insideOnly) {
        sql += " WHERE v.status = 'Inside'";
      }
      sql += ' ORDER BY v.visit_id DESC LIMIT 100';
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, visits: rows });
      return;
    }

    const mock = getMockState();
    let list = mock.visits.map((v) => {
      const vis = mock.visitors.find((vt) => vt.visitor_id === v.visitor_id);
      const s = mock.students.find((st) => st.student_id === v.student_id);
      const h = mock.hostels.find((hst) => hst.hostel_id === v.hostel_id);
      const alloc = s ? mock.allocations.find((a) => a.student_id === s.student_id && a.status === 'Active') : null;
      const room = alloc ? mock.rooms.find((r) => r.room_id === alloc.room_id) : null;
      return {
        ...v,
        visitor_name: vis?.full_name || 'Guest',
        visitor_phone: vis?.phone || '',
        id_proof_type: vis?.id_proof_type || '',
        id_proof_number: vis?.id_proof_number || '',
        visitor_address: vis?.address || '',
        student_name: s?.name || 'Unknown Student',
        student_code: s?.student_code || '',
        room_number: room?.room_number || 'N/A',
        hostel_name: h?.hostel_name || '',
      };
    }).reverse();

    if (insideOnly) {
      list = list.filter((v) => v.status === 'Inside');
    }

    res.json({ success: true, visits: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve visitor records' });
  }
}

export async function registerVisit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    full_name,
    phone,
    id_proof_type,
    id_proof_number,
    address,
    student_id,
    hostel_id,
    relation_to_student,
    purpose,
  } = req.body;

  if (!full_name || !phone || !id_proof_type || !id_proof_number || !student_id || !relation_to_student || !purpose) {
    res.status(400).json({ success: false, message: 'Please provide all required visitor registration details' });
    return;
  }

  const guardName = req.user?.name || 'Duty Security Guard';
  const targetHostelId = hostel_id || 1;
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      // Find or insert visitor
      let visitorId: number;
      const [existingVis]: any = await pool.query(
        'SELECT visitor_id FROM Visitor WHERE phone = ? OR id_proof_number = ? LIMIT 1',
        [phone, id_proof_number]
      );
      if (existingVis.length > 0) {
        visitorId = existingVis[0].visitor_id;
      } else {
        const [visResult]: any = await pool.query(
          'INSERT INTO Visitor (full_name, phone, id_proof_type, id_proof_number, address) VALUES (?, ?, ?, ?, ?)',
          [full_name, phone, id_proof_type, id_proof_number, address || '']
        );
        visitorId = visResult.insertId;
      }

      // Record Visit
      const [visitResult]: any = await pool.query(
        `INSERT INTO Visit (visitor_id, student_id, hostel_id, relation_to_student, purpose, status, guard_name)
         VALUES (?, ?, ?, ?, ?, 'Inside', ?)`,
        [visitorId, student_id, targetHostelId, relation_to_student, purpose, guardName]
      );

      res.status(201).json({
        success: true,
        message: `Visitor ${full_name} registered and checked in successfully`,
        visit_id: visitResult.insertId,
      });
      return;
    }

    const mock = getMockState();
    let vis = mock.visitors.find((v) => v.phone === phone || v.id_proof_number === id_proof_number);
    let visitorId: number;

    if (vis) {
      visitorId = vis.visitor_id;
    } else {
      visitorId = (mock.visitors[mock.visitors.length - 1]?.visitor_id || 0) + 1;
      vis = {
        visitor_id: visitorId,
        full_name,
        phone,
        id_proof_type,
        id_proof_number,
        address: address || '',
        created_at: new Date().toISOString(),
      };
      mock.visitors.push(vis);
    }

    const newVisitId = (mock.visits[mock.visits.length - 1]?.visit_id || 0) + 1;
    const newVisit = {
      visit_id: newVisitId,
      visitor_id: visitorId,
      student_id: Number(student_id),
      hostel_id: Number(targetHostelId),
      relation_to_student,
      purpose,
      check_in: new Date().toISOString().slice(0, 19).replace('T', ' '),
      check_out: null,
      status: 'Inside',
      guard_name: guardName,
      created_at: new Date().toISOString(),
    };
    mock.visits.unshift(newVisit);

    res.status(201).json({
      success: true,
      message: `Visitor ${full_name} registered and checked in successfully`,
      visit: newVisit,
    });
  } catch (err: any) {
    console.error('registerVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to register visitor' });
  }
}

export async function checkoutVisitor(req: AuthenticatedRequest, res: Response): Promise<void> {
  const visitId = parseInt(req.params.visitId, 10);
  const dbStatus = getDatabaseStatus();

  try {
    const checkoutTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      await pool.query(
        "UPDATE Visit SET check_out = ?, status = 'Checked Out' WHERE visit_id = ?",
        [checkoutTime, visitId]
      );
      res.json({ success: true, message: `Visitor visit #${visitId} checked out successfully` });
      return;
    }

    const mock = getMockState();
    const visit = mock.visits.find((v) => v.visit_id === visitId);
    if (!visit) {
      res.status(404).json({ success: false, message: 'Visit record not found' });
      return;
    }
    visit.check_out = checkoutTime;
    visit.status = 'Checked Out';

    res.json({ success: true, message: `Visitor visit #${visitId} checked out successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to check out visitor' });
  }
}

// -------------------------------------------------------------
// Guard: Student Entry / Exit & Security Logs
// -------------------------------------------------------------
export async function getSecurityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const sql = `
        SELECT 
          l.log_id, l.student_id, l.event_type, l.event_time, l.is_late_entry, 
          l.destination, l.reason, l.logged_by, l.created_at,
          s.name AS student_name, s.student_code, s.phone AS student_phone,
          r.room_number, h.hostel_name
        FROM Security_Log l
        JOIN Student s ON l.student_id = s.student_id
        LEFT JOIN Allocation a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN Room r ON a.room_id = r.room_id
        LEFT JOIN Hostel h ON r.hostel_id = h.hostel_id
        ORDER BY l.log_id DESC LIMIT 100
      `;
      const [rows]: any = await pool.query(sql);
      res.json({ success: true, logs: rows });
      return;
    }

    const mock = getMockState();
    const list = mock.security_logs.map((l) => {
      const s = mock.students.find((st) => st.student_id === l.student_id);
      const alloc = s ? mock.allocations.find((a) => a.student_id === s.student_id && a.status === 'Active') : null;
      const room = alloc ? mock.rooms.find((r) => r.room_id === alloc.room_id) : null;
      const hostel = room ? mock.hostels.find((h) => h.hostel_id === room.hostel_id) : null;
      return {
        ...l,
        student_name: s?.name || 'Unknown',
        student_code: s?.student_code || '',
        student_phone: s?.phone || '',
        room_number: room?.room_number || 'N/A',
        hostel_name: hostel?.hostel_name || '',
      };
    }).reverse();

    res.json({ success: true, logs: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve security logs' });
  }
}

export async function createSecurityLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { student_id, event_type, destination, reason, is_late_entry } = req.body;
  if (!student_id || !event_type) {
    res.status(400).json({ success: false, message: 'Student ID and Event Type (Entry/Exit) are required' });
    return;
  }

  const guardName = req.user?.name || 'Duty Security Guard';
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Automatic late-night rule: after 21:30 (9:30 PM) or before 06:00 AM on entry
  const isAfterCurfew = event_type === 'Entry' && (currentHour > 21 || (currentHour === 21 && currentMinutes >= 30) || currentHour < 6);
  const flaggedLate = is_late_entry !== undefined ? Boolean(is_late_entry) : isAfterCurfew;

  const eventTime = now.toISOString().slice(0, 19).replace('T', ' ');
  const dbStatus = getDatabaseStatus();

  try {
    if (dbStatus.isMySQL && getPool()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO Security_Log (student_id, event_type, event_time, is_late_entry, destination, reason, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_id, event_type, eventTime, flaggedLate ? 1 : 0, destination || null, reason || null, guardName]
      );

      res.status(201).json({
        success: true,
        message: `${event_type} logged successfully${flaggedLate ? ' (FLAGGED LATE NIGHT)' : ''}`,
        log_id: result.insertId,
        is_late_entry: flaggedLate,
      });
      return;
    }

    const mock = getMockState();
    const newId = (mock.security_logs[mock.security_logs.length - 1]?.log_id || 0) + 1;
    const newLog = {
      log_id: newId,
      student_id: Number(student_id),
      event_type,
      event_time: eventTime,
      is_late_entry: flaggedLate ? 1 : 0,
      destination: destination || null,
      reason: reason || null,
      logged_by: guardName,
      created_at: new Date().toISOString(),
    };
    mock.security_logs.unshift(newLog);

    res.status(201).json({
      success: true,
      message: `${event_type} logged successfully${flaggedLate ? ' (FLAGGED LATE NIGHT)' : ''}`,
      log: newLog,
      is_late_entry: flaggedLate,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to log security entry/exit' });
  }
}
