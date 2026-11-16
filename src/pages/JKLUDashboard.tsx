import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  BedDouble,
  AlertCircle,
  Sparkles,
  UserCheck,
  DoorOpen,
  Clock,
  Wrench,
  Shield,
  UtensilsCrossed,
  Plus,
  CheckCircle,
  Search,
  Calendar,
  Edit2,
  Check,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { StatCard } from '../components/StatCard.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';

interface JKLUDashboardProps {
  user: any;
  activeTab: string;
  selectedHostelFilter: string | null;
  onSelectHostel: (hostel: string | null) => void;
}

export const JKLUDashboard: React.FC<JKLUDashboardProps> = ({
  user,
  activeTab,
  selectedHostelFilter,
  onSelectHostel,
}) => {
  const isChiefWarden = user.role === 'Chief Warden';
  const effectiveHostel = isChiefWarden ? selectedHostelFilter : user.assigned_hostel;

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [hostelBreakdown, setHostelBreakdown] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [cleaning, setCleaning] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [outPasses, setOutPasses] = useState<any[]>([]);
  const [lateEntries, setLateEntries] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [handover, setHandover] = useState<any[]>([]);
  const [messMenu, setMessMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification Banner
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [selectedStudentForRoll, setSelectedStudentForRoll] = useState<any>(null);
  const [newRollNumber, setNewRollNumber] = useState('');
  const [rollFormatError, setRollFormatError] = useState<string | null>(null);

  const [isAddComplaintOpen, setIsAddComplaintOpen] = useState(false);
  const [isUpdateComplaintOpen, setIsUpdateComplaintOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  const [isAddCleaningOpen, setIsAddCleaningOpen] = useState(false);
  const [isAddOutPassOpen, setIsAddOutPassOpen] = useState(false);
  const [isAddLateEntryOpen, setIsAddLateEntryOpen] = useState(false);
  const [isAddAttendanceOpen, setIsAddAttendanceOpen] = useState(false);
  const [isAddMaintOpen, setIsAddMaintOpen] = useState(false);
  const [isAddHandoverOpen, setIsAddHandoverOpen] = useState(false);

  const [isEditMessModalOpen, setIsEditMessModalOpen] = useState(false);
  const [selectedMessSlot, setSelectedMessSlot] = useState<any>(null);
  const [messMenuItems, setMessMenuItems] = useState('');
  const [messMealTiming, setMessMealTiming] = useState('');

  // Forms
  const [complaintForm, setComplaintForm] = useState({
    student_name: '',
    student_roll_no: '',
    hostel_code: effectiveHostel || 'GH1',
    room_no: '',
    complaint_type: 'Electrical',
    complaint_details: '',
  });

  const [cleaningForm, setCleaningForm] = useState({
    hostel_code: effectiveHostel || 'GH1',
    floor_or_area: 'Floor 1 Corridor & Restroom',
    cleaner_name: 'Pooja Bai',
    cleaning_date: new Date().toISOString().split('T')[0],
    cleaning_time: '09:00:00',
    inspection_status: 'Satisfactory',
    remarks: 'Disinfected and mopped',
  });

  const [outPassForm, setOutPassForm] = useState({
    student_name: '',
    roll_no: '',
    hostel_code: effectiveHostel || 'GH1',
    room_no: '',
    destination: 'Jaipur City Center / Metro',
    expected_in_date: new Date().toISOString().split('T')[0],
    expected_in_time: '20:30:00',
    contact_number: '9829011100',
    remarks: 'Day out-pass',
  });

  const [lateEntryForm, setLateEntryForm] = useState({
    student_name: '',
    roll_no: '',
    hostel_code: effectiveHostel || 'GH1',
    room_no: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: '22:45:00',
    reason_for_late: 'Academic lab project delay',
    guard_on_duty: 'Rajesh Yadav',
    action_or_remarks: 'Late entry logged',
  });

  const [attendanceForm, setAttendanceForm] = useState({
    student_name: '',
    roll_no: '',
    hostel_code: effectiveHostel || 'GH1',
    room_no: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    remarks: 'Present at roll call',
  });

  const [maintForm, setMaintForm] = useState({
    hostel_code: effectiveHostel || 'GH1',
    location_or_room: 'Room 101',
    issue_description: '',
    work_type: 'Electrical',
    assigned_worker: 'Mukesh Sharma (Electrician)',
    cost: '0.00',
  });

  const [handoverForm, setHandoverForm] = useState({
    hostel_code: effectiveHostel || 'GH1',
    shift: 'Evening (14:00 - 22:00)',
    outgoing_guard: 'Rajesh Yadav',
    incoming_guard: 'Mahesh Shinde',
    keys_status: 'All room & gate keys accounted for',
    incident_summary: 'Shift quiet, gate movements logged',
  });

  const notify = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Load Data
  const loadData = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    const hostelParam = effectiveHostel ? `?hostel=${effectiveHostel}` : '';
    try {
      const results = await Promise.allSettled([
        apiRequest(`/jklu/stats${hostelParam}`),
        apiRequest(`/jklu/students${hostelParam}`),
        apiRequest(`/jklu/rooms${hostelParam}`),
        apiRequest(`/jklu/registers/complaints${hostelParam}`),
        apiRequest(`/jklu/registers/cleaning${hostelParam}`),
        apiRequest(`/jklu/registers/attendance${hostelParam}`),
        apiRequest(`/jklu/registers/student-out${hostelParam}`),
        apiRequest(`/jklu/registers/late-night${hostelParam}`),
        apiRequest(`/jklu/registers/maintenance${hostelParam}`),
        apiRequest(`/jklu/registers/security-handover${hostelParam}`),
        apiRequest('/jklu/mess/menu'),
      ]);

      const [
        statsRes,
        studentsRes,
        roomsRes,
        compRes,
        cleaningRes,
        attRes,
        outRes,
        lateRes,
        maintRes,
        handoverRes,
        messRes,
      ] = results;

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.stats);
        if (statsRes.value.hostelBreakdown) setHostelBreakdown(statsRes.value.hostelBreakdown);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value?.success) setStudents(studentsRes.value.students || []);
      if (roomsRes.status === 'fulfilled' && roomsRes.value?.success) setRooms(roomsRes.value.rooms || []);
      if (compRes.status === 'fulfilled' && compRes.value?.success) setComplaints(compRes.value.complaints || []);
      if (cleaningRes.status === 'fulfilled' && cleaningRes.value?.success) setCleaning(cleaningRes.value.records || []);
      if (attRes.status === 'fulfilled' && attRes.value?.success) setAttendance(attRes.value.records || []);
      if (outRes.status === 'fulfilled' && outRes.value?.success) setOutPasses(outRes.value.records || []);
      if (lateRes.status === 'fulfilled' && lateRes.value?.success) setLateEntries(lateRes.value.records || []);
      if (maintRes.status === 'fulfilled' && maintRes.value?.success) setMaintenance(maintRes.value.records || []);
      if (handoverRes.status === 'fulfilled' && handoverRes.value?.success) setHandover(handoverRes.value.records || []);
      if (messRes.status === 'fulfilled' && messRes.value?.success) setMessMenu(messRes.value.menu || []);
    } catch (err: any) {
      console.warn('Data sync notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Whenever hostel filter or activeTab is viewed, sync data to ensure the page appears updated!
    loadData(false);
  }, [effectiveHostel, activeTab]);

  // Roll Number update handler with JKLU format validation
  const handleUpdateRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setRollFormatError(null);

    // Validate format: 2025Btech224, 2024BBA015, 2024BDes008
    const regex = /^20[2-9][0-9](Btech|BBA|BDes|MTech|BCA)[0-9]{3}$/i;
    if (!regex.test(newRollNumber.trim())) {
      setRollFormatError(
        'Invalid JKLU Roll Number. Expected pattern: Year + Programme + 3 digits (e.g. 2025Btech224, 2024BBA015, or 2024BDes008).'
      );
      return;
    }

    try {
      const res = await apiRequest(`/jklu/students/${selectedStudentForRoll.student_id}/roll-number`, 'PUT', {
        student_code: newRollNumber.trim(),
      });
      if (res.success) {
        notify('success', `Student roll number updated to ${newRollNumber.trim()}`);
        setIsRollModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setRollFormatError(err.message || 'Failed to update roll number');
    }
  };

  // Add Complaint
  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/complaints', 'POST', {
        ...complaintForm,
        hostel_code: effectiveHostel || complaintForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Complaint successfully entered in register_complaints table');
        setIsAddComplaintOpen(false);
        setComplaintForm({
          student_name: '',
          student_roll_no: '',
          hostel_code: effectiveHostel || 'GH1',
          room_no: '',
          complaint_type: 'Electrical',
          complaint_details: '',
        });
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Could not register complaint');
    }
  };

  // Update Complaint Status
  const handleUpdateComplaintStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await apiRequest(`/jklu/registers/complaints/${selectedComplaint.id}`, 'PATCH', {
        status: selectedComplaint.status,
        action_taken: selectedComplaint.action_taken,
      });
      if (res.success) {
        notify('success', 'Complaint status updated');
        setIsUpdateComplaintOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to update complaint');
    }
  };

  // Add Cleaning
  const handleAddCleaning = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/cleaning', 'POST', {
        ...cleaningForm,
        hostel_code: effectiveHostel || cleaningForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Cleaning inspection logged');
        setIsAddCleaningOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error recording cleaning');
    }
  };

  // Add OutPass
  const handleAddOutPass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/student-out', 'POST', {
        ...outPassForm,
        hostel_code: effectiveHostel || outPassForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Student gate out-pass registered');
        setIsAddOutPassOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating out-pass');
    }
  };

  // Mark Returned
  const handleMarkReturned = async (outId: number) => {
    try {
      const res = await apiRequest(`/jklu/registers/student-out/${outId}/in`, 'PATCH');
      if (res.success) {
        notify('success', 'Student return marked successfully with current timestamp');
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error marking return');
    }
  };

  // Add Late Entry
  const handleAddLateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/late-night', 'POST', {
        ...lateEntryForm,
        hostel_code: effectiveHostel || lateEntryForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Late night arrival registered in log');
        setIsAddLateEntryOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error recording late arrival');
    }
  };

  // Add Attendance
  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/attendance', 'POST', {
        ...attendanceForm,
        hostel_code: effectiveHostel || attendanceForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Attendance record saved');
        setIsAddAttendanceOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error recording attendance');
    }
  };

  // Add Maintenance
  const handleAddMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/maintenance', 'POST', {
        ...maintForm,
        hostel_code: effectiveHostel || maintForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Maintenance job registered');
        setIsAddMaintOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating maintenance ticket');
    }
  };

  // Complete Maintenance
  const handleCompleteMaint = async (maintId: number) => {
    try {
      const res = await apiRequest(`/jklu/registers/maintenance/${maintId}/complete`, 'PATCH');
      if (res.success) {
        notify('success', 'Maintenance job marked as completed');
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error completing maintenance');
    }
  };

  // Add Security Handover
  const handleAddHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/jklu/registers/security-handover', 'POST', {
        ...handoverForm,
        hostel_code: effectiveHostel || handoverForm.hostel_code,
      });
      if (res.success) {
        notify('success', 'Security shift handover logged');
        setIsAddHandoverOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error recording handover');
    }
  };

  // Edit Mess Timetable Slot
  const handleUpdateMessMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessSlot) return;
    try {
      const res = await apiRequest(`/jklu/mess/menu/${selectedMessSlot.menu_id}`, 'PUT', {
        menu_items: messMenuItems,
        meal_timing: messMealTiming,
      });
      if (res.success) {
        notify('success', `Mess timetable updated for ${selectedMessSlot.day_of_week} ${selectedMessSlot.meal_type}`);
        setIsEditMessModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to update mess configuration');
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
  const mealTypes = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'] as const;

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="font-bold hover:underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          1. DASHBOARD OVERVIEW
      -------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                {isChiefWarden
                  ? selectedHostelFilter
                    ? `Chief Warden Overview — ${selectedHostelFilter}`
                    : 'Chief Warden Master Overview (All 4 Hostels)'
                  : `${effectiveHostel} Warden Dashboard`}
              </h2>
              <p className="text-xs text-slate-500">
                Operational records and register logs for JK Lakshmipat University residential campus
              </p>
            </div>

            {/* Room Layout Note */}
            <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Room Numbering System:</span>{' '}
              {effectiveHostel === 'GH2' ? (
                <span className="text-red-800 font-semibold">
                  GH2 Flat Numbering: 4 flats per floor (e.g. 101A, 101B, 101C, 101D)
                </span>
              ) : (
                <span>Standard Room Numbers (e.g. 101, 102, 201...)</span>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Students Enrolled"
              value={stats?.totalStudents ?? '—'}
              subtitle={effectiveHostel ? `Residents in ${effectiveHostel}` : 'All 4 Hostels total'}
              icon={Users}
              badge="Enrolled"
              badgeColor="blue"
            />
            <StatCard
              title="Hostel Capacity"
              value={`${stats?.totalOccupied ?? 0} / ${stats?.totalCapacity ?? 0}`}
              subtitle={`${stats?.vacantBeds ?? 0} vacant beds`}
              icon={BedDouble}
              badge={`${stats?.vacantBeds ?? 0} Vacant`}
              badgeColor={stats?.vacantBeds > 0 ? 'green' : 'amber'}
            />
            <StatCard
              title="Pending Complaints"
              value={stats?.pendingComplaints ?? '—'}
              subtitle="Registered grievances"
              icon={AlertCircle}
              badge={stats?.pendingComplaints > 0 ? 'Action Needed' : 'Cleared'}
              badgeColor={stats?.pendingComplaints > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Late Night Entries"
              value={stats?.lateEntries ?? 0}
              subtitle="Curfew violations recorded"
              icon={Clock}
              badge={stats?.lateEntries > 0 ? 'Logged' : 'None'}
              badgeColor={stats?.lateEntries > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Chief Warden: 4 Hostels Comparative Matrix */}
          {isChiefWarden && hostelBreakdown.length > 0 && !selectedHostelFilter && (
            <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Hostel-wise Comparative Analysis (GH1, GH2, BH1, BH2)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct comparisons aggregated strictly from verified database records
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-2.5">Hostel Code</th>
                      <th className="px-4 py-2.5">Hostel Name</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Rooms</th>
                      <th className="px-4 py-2.5">Bed Occupancy</th>
                      <th className="px-4 py-2.5">Pending Complaints</th>
                      <th className="px-4 py-2.5">Late Entries</th>
                      <th className="px-4 py-2.5 text-right">Inspect Hostel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {hostelBreakdown.map((h) => (
                      <tr key={h.hostel_code} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-red-900 font-mono">{h.hostel_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{h.hostel_name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                              h.gender === 'Girls'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {h.gender}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{h.roomsCount} rooms</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {h.occupied} / {h.capacity}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({h.capacity > 0 ? Math.round((h.occupied / h.capacity) * 100) : 0}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                              h.pendingComplaints > 0
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {h.pendingComplaints} Pending
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={h.lateEntries > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}>
                            {h.lateEntries} recorded
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSelectHostel(h.hostel_code)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                          >
                            Inspect {h.hostel_code}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          2. STUDENTS DIRECTORY & ROLL NUMBER CORRECTION
      -------------------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Students Registry {effectiveHostel ? `(${effectiveHostel})` : '(All Hostels)'}
              </h2>
              <p className="text-xs text-slate-500">
                Preserved official JKLU student records with programme formats (B.Tech, BBA, B.Des)
              </p>
            </div>
          </div>

          <DataTable
            data={students}
            loading={loading}
            searchPlaceholder="Search by roll number, student name, department..."
            columns={[
              {
                header: 'JKLU Roll Number',
                accessor: (s: any) =>
                  s.student_code ? (
                    <span className="font-mono font-bold text-slate-900">{s.student_code}</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Unavailable
                    </span>
                  ),
              },
              {
                header: 'Student Name',
                accessor: (s: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.email}</div>
                  </div>
                ),
              },
              {
                header: 'Hostel & Room',
                accessor: (s: any) => (
                  <span className="font-medium text-slate-800">
                    {s.hostel_code || 'Unassigned'} • Room {s.room_number || 'N/A'}
                  </span>
                ),
              },
              {
                header: 'Programme & Year',
                accessor: (s: any) => (
                  <div>
                    <span className="font-semibold text-slate-800">{s.programme || s.department}</span>
                    <div className="text-[11px] text-slate-500">Year {s.year_of_study}</div>
                  </div>
                ),
              },
              {
                header: 'Contact Information',
                accessor: (s: any) => (
                  <div className="text-[11px]">
                    <div>Phone: {s.phone}</div>
                    <div className="text-slate-400">Emergency: {s.emergency_contact}</div>
                  </div>
                ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (s: any) => (
                  <button
                    onClick={() => {
                      setSelectedStudentForRoll(s);
                      setNewRollNumber(s.student_code || '');
                      setRollFormatError(null);
                      setIsRollModalOpen(true);
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-red-800 hover:bg-slate-100 rounded border border-slate-200 transition"
                    title="Update Roll Number"
                  >
                    <Edit2 className="w-3 h-3 inline mr-1" />
                    {s.student_code ? 'Edit Roll No' : 'Add Roll No'}
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          3. ROOMS INVENTORY
      -------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Rooms Inventory {effectiveHostel ? `(${effectiveHostel})` : '(All Hostels)'}
              </h2>
              <p className="text-xs text-slate-500">
                {effectiveHostel === 'GH2'
                  ? 'GH2 flat-based rooms (4 flats A, B, C, D per floor)'
                  : 'Hostel room capacities and current occupancy status'}
              </p>
            </div>
          </div>

          <DataTable
            data={rooms}
            loading={loading}
            searchPlaceholder="Filter rooms by number, floor, status..."
            columns={[
              {
                header: 'Room Number',
                accessor: (r: any) => (
                  <span className="font-mono font-bold text-red-900 text-xs">
                    {r.room_number}
                  </span>
                ),
              },
              {
                header: 'Hostel Code',
                accessor: (r: any) => (
                  <span className="font-semibold text-slate-900 font-mono">{r.hostel_code}</span>
                ),
              },
              {
                header: 'Floor',
                accessor: (r: any) => `Floor ${r.floor_number}`,
              },
              {
                header: 'Bed Capacity / Occupancy',
                accessor: (r: any) => (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {r.current_occupancy} / {r.capacity} Beds
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        r.status === 'Full'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ),
              },
              {
                header: 'Monthly Rent',
                accessor: (r: any) => `₹ ${Number(r.monthly_fee).toLocaleString('en-IN')}`,
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          4. COMPLAINTS (register_complaints)
      -------------------------------------------------------------- */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Complaints Register (`register_complaints`)
              </h2>
              <p className="text-xs text-slate-500">
                Maintenance and service requests logged for {effectiveHostel || 'all hostels'}
              </p>
            </div>
            <button
              onClick={() => setIsAddComplaintOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log New Complaint
            </button>
          </div>

          <DataTable
            data={complaints}
            loading={loading}
            searchPlaceholder="Search complaints by student, room, type..."
            columns={[
              {
                header: 'Entry Date',
                accessor: 'complaint_date',
              },
              {
                header: 'Student & Room',
                accessor: (c: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{c.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.student_roll_no || 'No Roll No'} • {c.hostel_code} Rm {c.room_no}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Complaint Type',
                accessor: (c: any) => (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {c.complaint_type}
                  </span>
                ),
              },
              {
                header: 'Complaint Details',
                accessor: (c: any) => (
                  <p className="text-xs text-slate-700 line-clamp-2 max-w-sm">{c.complaint_details}</p>
                ),
              },
              {
                header: 'Status',
                accessor: (c: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      c.status === 'Resolved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : c.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {c.status}
                  </span>
                ),
              },
              {
                header: 'Action Taken',
                accessor: (c: any) => (
                  <div className="text-[11px] text-slate-600">
                    {c.action_taken || <span className="text-slate-400 italic">None logged</span>}
                    {c.resolved_date && <div className="text-slate-400 text-[10px]">Resolved: {c.resolved_date}</div>}
                  </div>
                ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (c: any) => (
                  <button
                    onClick={() => {
                      setSelectedComplaint(c);
                      setIsUpdateComplaintOpen(true);
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-red-800 hover:bg-slate-100 rounded border border-slate-200"
                  >
                    Update
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          5. CLEANING REGISTER (cleaning_register)
      -------------------------------------------------------------- */}
      {activeTab === 'cleaning_register' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Daily Housekeeping & Cleaning Register (`cleaning_register`)
              </h2>
              <p className="text-xs text-slate-500">
                Sanitization and cleanliness inspection audits for residential corridors and restrooms
              </p>
            </div>
            <button
              onClick={() => setIsAddCleaningOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Cleaning Entry
            </button>
          </div>

          <DataTable
            data={cleaning}
            loading={loading}
            searchPlaceholder="Search cleaning records by area, cleaner, inspector..."
            columns={[
              {
                header: 'Date & Time',
                accessor: (r: any) => `${r.cleaning_date} ${r.cleaning_time}`,
              },
              {
                header: 'Hostel & Area',
                accessor: (r: any) => (
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{r.hostel_code}</span>
                    <div className="text-slate-600">{r.floor_or_area}</div>
                  </div>
                ),
              },
              {
                header: 'Housekeeping Staff',
                accessor: 'cleaner_name',
              },
              {
                header: 'Inspection Status',
                accessor: (r: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      r.inspection_status === 'Satisfactory'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {r.inspection_status}
                  </span>
                ),
              },
              {
                header: 'Remarks',
                accessor: 'remarks',
              },
              {
                header: 'Inspected By',
                accessor: 'inspected_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          6. ATTENDANCE REGISTER (attendance_register)
      -------------------------------------------------------------- */}
      {activeTab === 'attendance_register' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Night Roll-Call Attendance Register (`attendance_register`)
              </h2>
              <p className="text-xs text-slate-500">
                Nightly curfew headcount and attendance roll-call records
              </p>
            </div>
            <button
              onClick={() => setIsAddAttendanceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Attendance
            </button>
          </div>

          <DataTable
            data={attendance}
            loading={loading}
            searchPlaceholder="Search attendance by student or roll number..."
            columns={[
              {
                header: 'Date',
                accessor: 'date',
              },
              {
                header: 'Student Resident',
                accessor: (a: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{a.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {a.roll_no || 'No Roll No'} • {a.hostel_code} Rm {a.room_no}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Roll-Call Status',
                accessor: (a: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      a.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : a.status === 'Absent'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {a.status}
                  </span>
                ),
              },
              {
                header: 'Remarks',
                accessor: 'remarks',
              },
              {
                header: 'Recorded By',
                accessor: 'recorded_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          7. STUDENT OUT REGISTER (student_out_register)
      -------------------------------------------------------------- */}
      {activeTab === 'student_out_register' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Student Out Register (`student_out_register`)
              </h2>
              <p className="text-xs text-slate-500">
                Gate out-pass monitoring, approved departure and return records
              </p>
            </div>
            <button
              onClick={() => setIsAddOutPassOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Gate Out-Pass
            </button>
          </div>

          <DataTable
            data={outPasses}
            loading={loading}
            searchPlaceholder="Search out-passes by student, destination, roll number..."
            columns={[
              {
                header: 'Student Details',
                accessor: (o: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{o.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {o.roll_no || 'No Roll No'} • {o.hostel_code} Rm {o.room_no}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Destination',
                accessor: 'destination',
              },
              {
                header: 'Departure (Out)',
                accessor: (o: any) => `${o.out_date} ${o.out_time}`,
              },
              {
                header: 'Expected Return',
                accessor: (o: any) => `${o.expected_in_date} ${o.expected_in_time}`,
              },
              {
                header: 'Actual Return',
                accessor: (o: any) =>
                  o.actual_in_date ? (
                    <span className="font-mono text-emerald-800">
                      {o.actual_in_date} {o.actual_in_time}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Still Out
                    </span>
                  ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (o: any) =>
                  !o.actual_in_date ? (
                    <button
                      onClick={() => handleMarkReturned(o.out_id)}
                      className="px-2 py-1 text-[11px] font-semibold text-white bg-red-800 hover:bg-red-900 rounded"
                    >
                      Mark Returned
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">Returned</span>
                  ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          8. LATE-NIGHT ENTRY (late_night_entry)
      -------------------------------------------------------------- */}
      {activeTab === 'late_night_entry' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Late-Night Entry Log (`late_night_entry`)
              </h2>
              <p className="text-xs text-slate-500">
                Hostel gate curfew infractions and verified reasons
              </p>
            </div>
            <button
              onClick={() => setIsAddLateEntryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Late Entry
            </button>
          </div>

          <DataTable
            data={lateEntries}
            loading={loading}
            searchPlaceholder="Search late entries..."
            columns={[
              {
                header: 'Entry Date & Time',
                accessor: (l: any) => (
                  <span className="font-mono font-semibold text-red-900">
                    {l.entry_date} {l.entry_time}
                  </span>
                ),
              },
              {
                header: 'Student Resident',
                accessor: (l: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{l.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {l.roll_no || 'No Roll No'} • {l.hostel_code} Rm {l.room_no}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Reason for Late Arrival',
                accessor: (l: any) => <p className="text-xs text-slate-700 max-w-sm">{l.reason_for_late}</p>,
              },
              {
                header: 'Gate Officer',
                accessor: 'guard_on_duty',
              },
              {
                header: 'Warden Status',
                accessor: (l: any) => (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Warden Notified
                  </span>
                ),
              },
              {
                header: 'Action Taken',
                accessor: 'action_or_remarks',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          9. MAINTENANCE (maintenance_register)
      -------------------------------------------------------------- */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Hostel Maintenance Register (`maintenance_register`)
              </h2>
              <p className="text-xs text-slate-500">
                Electrical, plumbing, carpentry, and civil work orders
              </p>
            </div>
            <button
              onClick={() => setIsAddMaintOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Maintenance
            </button>
          </div>

          <DataTable
            data={maintenance}
            loading={loading}
            searchPlaceholder="Search maintenance jobs..."
            columns={[
              {
                header: 'Hostel & Location',
                accessor: (m: any) => `${m.hostel_code} • ${m.location_or_room}`,
              },
              {
                header: 'Work Type',
                accessor: (m: any) => (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {m.work_type}
                  </span>
                ),
              },
              {
                header: 'Issue Description',
                accessor: 'issue_description',
              },
              {
                header: 'Assigned Worker',
                accessor: 'assigned_worker',
              },
              {
                header: 'Reported Date',
                accessor: 'reported_date',
              },
              {
                header: 'Status',
                accessor: (m: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      m.completion_status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {m.completion_status}
                  </span>
                ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (m: any) =>
                  m.completion_status !== 'Completed' ? (
                    <button
                      onClick={() => handleCompleteMaint(m.maint_id)}
                      className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                    >
                      Mark Completed
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">Completed</span>
                  ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          10. SECURITY HANDOVER (security_handover)
      -------------------------------------------------------------- */}
      {activeTab === 'security_handover' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Security Shift Handover Register (`security_handover`)
              </h2>
              <p className="text-xs text-slate-500">
                Guard shift changeover, key audit log, and campus incident handover
              </p>
            </div>
            <button
              onClick={() => setIsAddHandoverOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Shift Handover
            </button>
          </div>

          <DataTable
            data={handover}
            loading={loading}
            searchPlaceholder="Search handover records..."
            columns={[
              {
                header: 'Date & Shift',
                accessor: (h: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{h.handover_date}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{h.shift}</div>
                  </div>
                ),
              },
              {
                header: 'Hostel',
                accessor: (h: any) => <span className="font-mono font-bold text-red-900">{h.hostel_code}</span>,
              },
              {
                header: 'Guards (Outgoing -> Incoming)',
                accessor: (h: any) => `${h.outgoing_guard} ➔ ${h.incoming_guard}`,
              },
              {
                header: 'Keys & Inventory Status',
                accessor: 'keys_status',
              },
              {
                header: 'Incident Summary',
                accessor: 'incident_summary',
              },
              {
                header: 'Warden Verified',
                accessor: (h: any) => (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Verified
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          11. MESS SECTION (Weekly Menu Timetable & Editable Config)
      -------------------------------------------------------------- */}
      {activeTab === 'mess' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                JKLU Mess & Dining Timetable
              </h2>
              <p className="text-xs text-slate-500">
                Official weekly meal schedule from Monday to Sunday (Breakfast, Lunch, Evening Snacks, Dinner)
              </p>
            </div>
            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 max-w-md">
              <span className="font-bold">Official University Notice:</span> Unconfigured slots display{' '}
              <em>"Menu not configured"</em> and <em>"Timings not configured"</em> until confirmed by the Chief Warden.
            </div>
          </div>

          {/* Weekly Timetable Grid */}
          <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-28">Day</th>
                    {mealTypes.map((meal) => (
                      <th key={meal} className="px-4 py-3">
                        {meal}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {daysOfWeek.map((day) => (
                    <tr key={day} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-slate-900 bg-slate-50/50">{day}</td>
                      {mealTypes.map((meal) => {
                        const slot = messMenu.find(
                          (m) => m.day_of_week === day && m.meal_type === meal
                        );
                        const isConfigured = Boolean(slot && slot.is_configured && slot.menu_items);

                        return (
                          <td key={meal} className="px-4 py-3 align-top min-w-[200px]">
                            <div className="p-2.5 rounded border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {meal}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedMessSlot(slot || { day_of_week: day, meal_type: meal });
                                    setMessMenuItems(slot?.menu_items || '');
                                    setMessMealTiming(slot?.meal_timing || '');
                                    setIsEditMessModalOpen(true);
                                  }}
                                  className="text-[10px] text-red-800 font-semibold hover:underline"
                                  title="Configure official menu and timings"
                                >
                                  Configure
                                </button>
                              </div>

                              {isConfigured ? (
                                <>
                                  <div className="font-semibold text-slate-900 text-xs">
                                    {slot.menu_items}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    {slot.meal_timing || 'Timings not configured'}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] text-slate-400 italic">
                                    Menu not configured
                                  </div>
                                  <div className="text-[10px] text-slate-400 italic font-mono">
                                    Timings not configured
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODALS
      -------------------------------------------------------------- */}

      {/* Modal: Update Student Roll Number */}
      <Modal
        isOpen={isRollModalOpen}
        onClose={() => setIsRollModalOpen(false)}
        title="Update Student Roll Number"
        subtitle={selectedStudentForRoll ? `Updating: ${selectedStudentForRoll.name}` : ''}
      >
        <form onSubmit={handleUpdateRoll} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="font-semibold text-slate-900">
              Department: {selectedStudentForRoll?.department} ({selectedStudentForRoll?.programme || 'B.Tech'})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Valid JKLU Roll Number formats:
              <ul className="list-disc pl-4 mt-1 font-mono text-[10px] text-slate-700">
                <li>B.Tech: 2025Btech224, 2024Btech102</li>
                <li>BBA: 2024BBA015, 2025BBA032</li>
                <li>B.Des: 2024BDes008, 2025BDes019</li>
              </ul>
            </div>
          </div>

          {rollFormatError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{rollFormatError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Enter Official JKLU Roll Number *
            </label>
            <input
              type="text"
              required
              value={newRollNumber}
              onChange={(e) => {
                setNewRollNumber(e.target.value);
                setRollFormatError(null);
              }}
              placeholder="e.g. 2025Btech224"
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-red-700"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRollModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Verify & Save Roll No
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Complaint */}
      <Modal
        isOpen={isAddComplaintOpen}
        onClose={() => setIsAddComplaintOpen(false)}
        title="Log Complaint in register_complaints"
        subtitle={`Registering in ${effectiveHostel || 'hostel'} register`}
      >
        <form onSubmit={handleAddComplaint} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                type="text"
                required
                value={complaintForm.student_name}
                onChange={(e) => setComplaintForm({ ...complaintForm, student_name: e.target.value })}
                placeholder="Student full name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Roll Number (Optional)</label>
              <input
                type="text"
                value={complaintForm.student_roll_no}
                onChange={(e) => setComplaintForm({ ...complaintForm, student_roll_no: e.target.value })}
                placeholder="e.g. 2025Btech224"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hostel Code *</label>
              <select
                disabled={!isChiefWarden}
                value={effectiveHostel || complaintForm.hostel_code}
                onChange={(e) => setComplaintForm({ ...complaintForm, hostel_code: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              >
                <option value="GH1">GH1 (Girls Hostel 1)</option>
                <option value="GH2">GH2 (Girls Hostel 2 - Flats)</option>
                <option value="BH1">BH1 (Boys Hostel 1)</option>
                <option value="BH2">BH2 (Boys Hostel 2)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={complaintForm.room_no}
                onChange={(e) => setComplaintForm({ ...complaintForm, room_no: e.target.value })}
                placeholder={effectiveHostel === 'GH2' ? 'e.g. 101A' : 'e.g. 101'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Complaint Type *</label>
            <select
              value={complaintForm.complaint_type}
              onChange={(e) => setComplaintForm({ ...complaintForm, complaint_type: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            >
              <option value="Electrical">Electrical (Fan, Tube light, Switch)</option>
              <option value="Plumbing">Plumbing (Tap, Leak, Washroom)</option>
              <option value="Carpentry">Carpentry (Bed, Desk, Almirah door)</option>
              <option value="Cleaning">Cleanliness / Washroom hygiene</option>
              <option value="Wi-Fi/Internet">Wi-Fi & LAN Network</option>
              <option value="Appliance">Water cooler / Geyser</option>
              <option value="Other">Other Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Complaint Details *</label>
            <textarea
              rows={3}
              required
              value={complaintForm.complaint_details}
              onChange={(e) => setComplaintForm({ ...complaintForm, complaint_details: e.target.value })}
              placeholder="Describe the defect or repair needed..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddComplaintOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Record Complaint
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Complaint Status */}
      <Modal
        isOpen={isUpdateComplaintOpen}
        onClose={() => setIsUpdateComplaintOpen(false)}
        title="Update Complaint Resolution"
        subtitle={selectedComplaint ? `Complaint #${selectedComplaint.id}` : ''}
      >
        {selectedComplaint && (
          <form onSubmit={handleUpdateComplaintStatus} className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-bold text-slate-900">
                {selectedComplaint.student_name} • {selectedComplaint.hostel_code} Room {selectedComplaint.room_no}
              </div>
              <p className="text-slate-600 mt-1">{selectedComplaint.complaint_details}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Resolution Status</label>
              <select
                value={selectedComplaint.status}
                onChange={(e) => setSelectedComplaint({ ...selectedComplaint, status: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-semibold"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Action Taken / Technician Remarks</label>
              <textarea
                rows={3}
                value={selectedComplaint.action_taken || ''}
                onChange={(e) => setSelectedComplaint({ ...selectedComplaint, action_taken: e.target.value })}
                placeholder="e.g. Technician replaced capacitor and verified operation"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUpdateComplaintOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
              >
                Save Updates
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Edit Mess Timetable Slot */}
      <Modal
        isOpen={isEditMessModalOpen}
        onClose={() => setIsEditMessModalOpen(false)}
        title="Configure Official Mess Timetable Entry"
        subtitle={selectedMessSlot ? `${selectedMessSlot.day_of_week} — ${selectedMessSlot.meal_type}` : ''}
      >
        <form onSubmit={handleUpdateMessMenu} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Official Meal Menu Items *
            </label>
            <textarea
              rows={3}
              required
              value={messMenuItems}
              onChange={(e) => setMessMenuItems(e.target.value)}
              placeholder="e.g. Aloo Paratha, Curd, Pickle, Tea, Bread Butter, Sprouts"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-red-700"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to display "Menu not configured".
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Meal Timings (e.g. 07:30 AM - 09:30 AM)
            </label>
            <input
              type="text"
              value={messMealTiming}
              onChange={(e) => setMessMealTiming(e.target.value)}
              placeholder="e.g. 07:30 AM - 09:30 AM"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-red-700"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to display "Timings not configured".
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditMessModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Out-Pass */}
      <Modal
        isOpen={isAddOutPassOpen}
        onClose={() => setIsAddOutPassOpen(false)}
        title="Record Gate Out-Pass (`student_out_register`)"
        subtitle={`Issuing gate exit permit for ${effectiveHostel || 'hostel'}`}
      >
        <form onSubmit={handleAddOutPass} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                type="text"
                required
                value={outPassForm.student_name}
                onChange={(e) => setOutPassForm({ ...outPassForm, student_name: e.target.value })}
                placeholder="Student full name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={outPassForm.roll_no}
                onChange={(e) => setOutPassForm({ ...outPassForm, roll_no: e.target.value })}
                placeholder="e.g. 2025Btech224"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={outPassForm.room_no}
                onChange={(e) => setOutPassForm({ ...outPassForm, room_no: e.target.value })}
                placeholder={effectiveHostel === 'GH2' ? 'e.g. 101A' : 'e.g. 101'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination *</label>
              <input
                type="text"
                required
                value={outPassForm.destination}
                onChange={(e) => setOutPassForm({ ...outPassForm, destination: e.target.value })}
                placeholder="e.g. Mansarovar / Vaishali Nagar"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Return Date</label>
              <input
                type="date"
                required
                value={outPassForm.expected_in_date}
                onChange={(e) => setOutPassForm({ ...outPassForm, expected_in_date: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Return Time</label>
              <input
                type="time"
                required
                value={outPassForm.expected_in_time}
                onChange={(e) => setOutPassForm({ ...outPassForm, expected_in_time: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
            <input
              type="tel"
              required
              value={outPassForm.contact_number}
              onChange={(e) => setOutPassForm({ ...outPassForm, contact_number: e.target.value })}
              placeholder="10-digit mobile"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOutPassOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Issue Out-Pass
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Late Entry */}
      <Modal
        isOpen={isAddLateEntryOpen}
        onClose={() => setIsAddLateEntryOpen(false)}
        title="Log Late-Night Curfew Entry (`late_night_entry`)"
        subtitle="Gate officer record of curfew arrival after permitted hours"
      >
        <form onSubmit={handleAddLateEntry} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                type="text"
                required
                value={lateEntryForm.student_name}
                onChange={(e) => setLateEntryForm({ ...lateEntryForm, student_name: e.target.value })}
                placeholder="Student full name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={lateEntryForm.roll_no}
                onChange={(e) => setLateEntryForm({ ...lateEntryForm, roll_no: e.target.value })}
                placeholder="e.g. 2025Btech224"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={lateEntryForm.room_no}
                onChange={(e) => setLateEntryForm({ ...lateEntryForm, room_no: e.target.value })}
                placeholder={effectiveHostel === 'GH2' ? 'e.g. 101A' : 'e.g. 101'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Arrival Time *</label>
              <input
                type="time"
                required
                value={lateEntryForm.entry_time}
                onChange={(e) => setLateEntryForm({ ...lateEntryForm, entry_time: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reason for Late Entry *</label>
            <textarea
              rows={2}
              required
              value={lateEntryForm.reason_for_late}
              onChange={(e) => setLateEntryForm({ ...lateEntryForm, reason_for_late: e.target.value })}
              placeholder="e.g. Delayed due to bus breakdown on Ajmer Road route"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Duty Security Guard *</label>
            <input
              type="text"
              required
              value={lateEntryForm.guard_on_duty}
              onChange={(e) => setLateEntryForm({ ...lateEntryForm, guard_on_duty: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddLateEntryOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Log Late Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Cleaning Entry */}
      <Modal
        isOpen={isAddCleaningOpen}
        onClose={() => setIsAddCleaningOpen(false)}
        title="Log Cleaning Record (`cleaning_register`)"
        subtitle="Hostel sanitation inspection record"
      >
        <form onSubmit={handleAddCleaning} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Floor / Wing / Area *</label>
            <input
              type="text"
              required
              value={cleaningForm.floor_or_area}
              onChange={(e) => setCleaningForm({ ...cleaningForm, floor_or_area: e.target.value })}
              placeholder="e.g. Floor 2 Common Washrooms Wing B"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Cleaner Name *</label>
              <input
                type="text"
                required
                value={cleaningForm.cleaner_name}
                onChange={(e) => setCleaningForm({ ...cleaningForm, cleaner_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Inspection Status</label>
              <select
                value={cleaningForm.inspection_status}
                onChange={(e) => setCleaningForm({ ...cleaningForm, inspection_status: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-semibold"
              >
                <option value="Satisfactory">Satisfactory</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="Re-cleaned">Re-cleaned</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Inspection Remarks</label>
            <input
              type="text"
              value={cleaningForm.remarks}
              onChange={(e) => setCleaningForm({ ...cleaningForm, remarks: e.target.value })}
              placeholder="Disinfectant used, bins emptied"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddCleaningOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Maintenance */}
      <Modal
        isOpen={isAddMaintOpen}
        onClose={() => setIsAddMaintOpen(false)}
        title="Schedule Maintenance (`maintenance_register`)"
        subtitle="Hostel repair ticket"
      >
        <form onSubmit={handleAddMaint} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Location or Room *</label>
              <input
                type="text"
                required
                value={maintForm.location_or_room}
                onChange={(e) => setMaintForm({ ...maintForm, location_or_room: e.target.value })}
                placeholder="e.g. Room 101 or Common Balcony"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Work Type *</label>
              <select
                value={maintForm.work_type}
                onChange={(e) => setMaintForm({ ...maintForm, work_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-semibold"
              >
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Civil">Civil / Masonry</option>
                <option value="Appliance">Water Cooler / Appliance</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Issue Description *</label>
            <textarea
              rows={2}
              required
              value={maintForm.issue_description}
              onChange={(e) => setMaintForm({ ...maintForm, issue_description: e.target.value })}
              placeholder="Describe work required..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Worker</label>
              <input
                type="text"
                value={maintForm.assigned_worker}
                onChange={(e) => setMaintForm({ ...maintForm, assigned_worker: e.target.value })}
                placeholder="Technician name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddMaintOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Create Job
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Security Handover */}
      <Modal
        isOpen={isAddHandoverOpen}
        onClose={() => setIsAddHandoverOpen(false)}
        title="Log Security Shift Handover (`security_handover`)"
        subtitle="Guard changeover & key verification"
      >
        <form onSubmit={handleAddHandover} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Shift Period *</label>
            <select
              value={handoverForm.shift}
              onChange={(e) => setHandoverForm({ ...handoverForm, shift: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-semibold"
            >
              <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
              <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
              <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Outgoing Officer *</label>
              <input
                type="text"
                required
                value={handoverForm.outgoing_guard}
                onChange={(e) => setHandoverForm({ ...handoverForm, outgoing_guard: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Incoming Officer *</label>
              <input
                type="text"
                required
                value={handoverForm.incoming_guard}
                onChange={(e) => setHandoverForm({ ...handoverForm, incoming_guard: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Keys & Gate Status</label>
            <input
              type="text"
              value={handoverForm.keys_status}
              onChange={(e) => setHandoverForm({ ...handoverForm, keys_status: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Shift Incident Summary</label>
            <textarea
              rows={2}
              value={handoverForm.incident_summary}
              onChange={(e) => setHandoverForm({ ...handoverForm, incident_summary: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddHandoverOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Log Handover
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Attendance */}
      <Modal
        isOpen={isAddAttendanceOpen}
        onClose={() => setIsAddAttendanceOpen(false)}
        title="Record Student Attendance"
        subtitle="Daily night roll call"
      >
        <form onSubmit={handleAddAttendance} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                type="text"
                required
                value={attendanceForm.student_name}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, student_name: e.target.value })}
                placeholder="Student full name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={attendanceForm.roll_no}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, roll_no: e.target.value })}
                placeholder="e.g. 2025Btech224"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={attendanceForm.room_no}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, room_no: e.target.value })}
                placeholder={effectiveHostel === 'GH2' ? 'e.g. 101A' : 'e.g. 101'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Attendance Status</label>
              <select
                value={attendanceForm.status}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-semibold"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Leave">On Leave</option>
                <option value="Sick">Sick Bay</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={attendanceForm.remarks}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, remarks: e.target.value })}
              placeholder="e.g. Present at 9:30 PM roll call"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddAttendanceOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-800 text-white rounded font-bold hover:bg-red-900 uppercase tracking-wider text-[11px]"
            >
              Save Attendance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
