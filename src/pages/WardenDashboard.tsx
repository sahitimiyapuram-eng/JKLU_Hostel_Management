import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  BedDouble,
  CreditCard,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  Wrench,
  UtensilsCrossed,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { StatCard } from '../components/StatCard.js';
import { DataTable, Column } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';

interface WardenDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const WardenDashboard: React.FC<WardenDashboardProps> = ({ activeTab, onTabChange }) => {
  // State
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [mess, setMess] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [isAddHostelOpen, setIsAddHostelOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isRecordFeeOpen, setIsRecordFeeOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);

  // Form states
  const [studentForm, setStudentForm] = useState({
    student_code: '',
    name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    department: 'Computer Science & Eng',
    year_of_study: '1',
    gender: 'Male',
    blood_group: 'O+',
    password: 'student123',
  });

  const [hostelForm, setHostelForm] = useState({
    hostel_name: '',
    total_floors: '4',
    gender: 'Boys',
    address: '',
  });

  const [roomForm, setRoomForm] = useState({
    hostel_id: '',
    room_number: '',
    floor_number: '1',
    capacity: '2',
    monthly_fee: '4500.00',
  });

  const [allocationForm, setAllocationForm] = useState({
    student_id: '',
    room_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: 'Allotted via Warden Portal',
  });

  const [feeForm, setFeeForm] = useState({
    student_id: '',
    amount_paid: '4500.00',
    due_amount: '0.00',
    payment_method: 'Online',
    transaction_reference: `TXN${Date.now().toString().slice(-8)}`,
    billing_month: 'October 2024',
    remarks: 'Full hostel fee payment',
  });

  const [complaintUpdateForm, setComplaintUpdateForm] = useState({
    status: 'In Progress',
    staff_id: '',
    resolution_remarks: '',
  });

  const [maintForm, setMaintForm] = useState({
    hostel_id: '',
    room_id: '',
    issue_type: '',
    description: '',
    cost: '0.00',
    assigned_staff_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
  });

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes, hostelsRes, roomsRes, allocRes, feesRes, compRes, staffRes, maintRes, messRes, secRes] =
        await Promise.all([
          apiRequest('/warden/stats'),
          apiRequest('/warden/students'),
          apiRequest('/warden/hostels'),
          apiRequest('/warden/rooms'),
          apiRequest('/warden/allocations'),
          apiRequest('/warden/fees'),
          apiRequest('/warden/complaints'),
          apiRequest('/warden/staff'),
          apiRequest('/warden/maintenance'),
          apiRequest('/warden/mess'),
          apiRequest('/guard/security-logs'),
        ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (studentsRes.success) setStudents(studentsRes.students);
      if (hostelsRes.success) {
        setHostels(hostelsRes.hostels);
        if (hostelsRes.hostels.length > 0 && !roomForm.hostel_id) {
          setRoomForm((prev) => ({ ...prev, hostel_id: String(hostelsRes.hostels[0].hostel_id) }));
          setMaintForm((prev) => ({ ...prev, hostel_id: String(hostelsRes.hostels[0].hostel_id) }));
        }
      }
      if (roomsRes.success) setRooms(roomsRes.rooms);
      if (allocRes.success) setAllocations(allocRes.allocations);
      if (feesRes.success) setFees(feesRes.fees);
      if (compRes.success) setComplaints(compRes.complaints);
      if (staffRes.success) setStaff(staffRes.staff);
      if (maintRes.success) setMaintenance(maintRes.maintenance);
      if (messRes.success) setMess(messRes.mess);
      if (secRes.success) setSecurityLogs(secRes.logs);
    } catch (err: any) {
      console.error('Error fetching warden data:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to sync with backend' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // -----------------------------------------------------------
  // Action Handlers
  // -----------------------------------------------------------
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/students', 'POST', studentForm);
      if (res.success) {
        showNotification('success', 'Student record successfully added to MySQL database');
        setIsAddStudentOpen(false);
        setStudentForm({
          student_code: '',
          name: '',
          email: '',
          phone: '',
          emergency_contact: '',
          department: 'Computer Science & Eng',
          year_of_study: '1',
          gender: 'Male',
          blood_group: 'O+',
          password: 'student123',
        });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Could not add student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const res = await apiRequest(`/warden/students/${selectedStudent.student_id}`, 'PUT', selectedStudent);
      if (res.success) {
        showNotification('success', 'Student record updated successfully');
        setIsEditStudentOpen(false);
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}"? This action is permanent.`)) {
      return;
    }
    try {
      const res = await apiRequest(`/warden/students/${studentId}`, 'DELETE');
      if (res.success) {
        showNotification('success', 'Student deleted successfully');
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Cannot delete student');
    }
  };

  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/hostels', 'POST', hostelForm);
      if (res.success) {
        showNotification('success', 'New Hostel block created successfully');
        setIsAddHostelOpen(false);
        setHostelForm({ hostel_name: '', total_floors: '4', gender: 'Boys', address: '' });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error creating hostel');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/rooms', 'POST', roomForm);
      if (res.success) {
        showNotification('success', `Room ${roomForm.room_number} created successfully`);
        setIsAddRoomOpen(false);
        setRoomForm((prev) => ({ ...prev, room_number: '' }));
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error adding room');
    }
  };

  const handleAllocateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/allocations', 'POST', allocationForm);
      if (res.success) {
        showNotification('success', 'Student successfully allocated to room! Occupancy updated.');
        setIsAllocateOpen(false);
        setAllocationForm((prev) => ({ ...prev, student_id: '', room_id: '' }));
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Room allocation failed');
    }
  };

  const handleTerminateAllocation = async (allocationId: number, studentName: string, roomNumber: string) => {
    if (!window.confirm(`Terminate room allocation for ${studentName} (Room ${roomNumber})? The bed slot will be marked available immediately.`)) {
      return;
    }
    try {
      const res = await apiRequest(`/warden/allocations/${allocationId}/terminate`, 'POST');
      if (res.success) {
        showNotification('success', 'Allocation terminated and room slot freed');
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to terminate allocation');
    }
  };

  const handleRecordFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/fees', 'POST', feeForm);
      if (res.success) {
        showNotification('success', 'Fee payment recorded successfully');
        setIsRecordFeeOpen(false);
        setFeeForm({
          student_id: '',
          amount_paid: '4500.00',
          due_amount: '0.00',
          payment_method: 'Online',
          transaction_reference: `TXN${Date.now().toString().slice(-8)}`,
          billing_month: 'October 2024',
          remarks: 'Full hostel fee payment',
        });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to record fee');
    }
  };

  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await apiRequest(`/warden/complaints/${selectedComplaint.complaint_id}`, 'PATCH', complaintUpdateForm);
      if (res.success) {
        showNotification('success', res.message || 'Complaint status updated');
        setIsComplaintModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update complaint');
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/warden/maintenance', 'POST', maintForm);
      if (res.success) {
        showNotification('success', 'Maintenance record created successfully');
        setIsAddMaintenanceOpen(false);
        setMaintForm({
          hostel_id: hostels[0]?.hostel_id ? String(hostels[0].hostel_id) : '',
          room_id: '',
          issue_type: '',
          description: '',
          cost: '0.00',
          assigned_staff_id: '',
          scheduled_date: new Date().toISOString().split('T')[0],
        });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to record maintenance ticket');
    }
  };

  // Helper options for modals
  const unallocatedStudents = students.filter((s) => !s.allocation_id || s.allocation_status === 'Terminated' || s.allocation_status === 'Unallocated');
  const availableRooms = rooms.filter((r) => r.status === 'Available' && r.current_occupancy < r.capacity);

  return (
    <div className="space-y-6">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 1: Overview Dashboard
      -------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hostel Administration Overview</h2>
              <p className="text-xs text-slate-500">Live operational counts synchronized from MySQL tables</p>
            </div>
            <button
              onClick={() => setIsAllocateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <BedDouble className="w-3.5 h-3.5" />
              Allocate Room
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Students"
              value={stats?.totalStudents ?? '—'}
              subtitle="Registered hostellers"
              icon={Users}
              badge="Enrolled"
              badgeColor="blue"
              onClick={() => onTabChange('students')}
            />
            <StatCard
              title="Hostels & Blocks"
              value={stats?.totalHostels ?? '—'}
              subtitle="Campus residential blocks"
              icon={Building}
              badge="Active"
              badgeColor="blue"
              onClick={() => onTabChange('hostels_rooms')}
            />
            <StatCard
              title="Room Occupancy"
              value={`${stats?.occupiedRooms ?? 0} / ${stats?.totalRooms ?? 0}`}
              subtitle={`${stats?.vacantRooms ?? 0} rooms with vacant beds`}
              icon={BedDouble}
              badge={`${stats?.vacantRooms ?? 0} Vacant`}
              badgeColor={stats?.vacantRooms > 0 ? 'green' : 'amber'}
              onClick={() => onTabChange('allocations')}
            />
            <StatCard
              title="Pending Complaints"
              value={stats?.pendingComplaints ?? '—'}
              subtitle="Requires staff resolution"
              icon={AlertCircle}
              badge={stats?.pendingComplaints > 0 ? 'Action Needed' : 'Cleared'}
              badgeColor={stats?.pendingComplaints > 0 ? 'amber' : 'green'}
              onClick={() => onTabChange('complaints')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Outstanding Fees"
              value={`₹ ${Number(stats?.pendingFees || 0).toLocaleString('en-IN')}`}
              subtitle="Overdue and pending fee dues"
              icon={CreditCard}
              badge="Pending Audit"
              badgeColor="red"
              onClick={() => onTabChange('fees')}
            />
            <StatCard
              title="Visitors Inside"
              value={stats?.visitorsInside ?? 0}
              subtitle="Guests currently checked into campus"
              icon={ShieldAlert}
              badge={stats?.visitorsInside > 0 ? 'Checked In' : 'None'}
              badgeColor="blue"
              onClick={() => onTabChange('security')}
            />
          </div>

          {/* Quick Action Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-md">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Quick Student Intake
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Register a new student record into the Student table.
              </p>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="w-full py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Student Record
              </button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-md">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Capacity & Room Audit
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Check available room beds or add a new room into the database.
              </p>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="w-full py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Room Record
              </button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-md">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Fee Collection Counter
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Record a student tuition or accommodation payment receipt.
              </p>
              <button
                onClick={() => setIsRecordFeeOpen(true)}
                className="w-full py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Fee Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 2: Students Directory
      -------------------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Directory</h2>
              <p className="text-xs text-slate-500">
                View, search, edit, and manage all enrolled hostel residents
              </p>
            </div>
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Student
            </button>
          </div>

          <DataTable
            data={students}
            loading={loading}
            searchPlaceholder="Search by student code, name, department, or email..."
            columns={[
              {
                header: 'Student Code',
                accessor: (s: any) => (
                  <span className="font-mono font-medium text-slate-900">{s.student_code}</span>
                ),
              },
              {
                header: 'Student Name',
                accessor: (s: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.email}</div>
                  </div>
                ),
              },
              {
                header: 'Dept & Year',
                accessor: (s: any) => (
                  <div>
                    <div>{s.department}</div>
                    <div className="text-[11px] text-slate-500">Year {s.year_of_study}</div>
                  </div>
                ),
              },
              {
                header: 'Contact',
                accessor: (s: any) => (
                  <div>
                    <div>Ph: {s.phone}</div>
                    <div className="text-[11px] text-slate-400">Emerg: {s.emergency_contact}</div>
                  </div>
                ),
              },
              {
                header: 'Room Allocation',
                accessor: (s: any) => {
                  if (s.room_number) {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {s.hostel_name ? `${s.hostel_name} • ` : ''}Room {s.room_number}
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Unallocated
                    </span>
                  );
                },
              },
              {
                header: 'Actions',
                className: 'text-right',
                accessor: (s: any) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedStudent(s);
                        setIsEditStudentOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      title="Edit student"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.student_id, s.name)}
                      className="p-1 rounded text-slate-500 hover:text-red-700 hover:bg-slate-100"
                      title="Delete student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 3: Hostels & Rooms
      -------------------------------------------------------------- */}
      {activeTab === 'hostels_rooms' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hostel & Room Master Records</h2>
              <p className="text-xs text-slate-500">
                Manage hostel blocks, room inventory, capacities, and occupancy rates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddHostelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Hostel
              </button>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Room
              </button>
            </div>
          </div>

          {/* Hostels Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hostels.map((h) => (
              <div key={h.hostel_id} className="p-4 bg-white border border-slate-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Hostel #{h.hostel_id} • {h.gender}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {h.total_floors} Floors
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{h.hostel_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{h.address}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Capacity: </span>
                    <strong className="text-slate-800">{h.total_occupied} / {h.total_capacity} Beds</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Rooms: </span>
                    <strong className="text-slate-800">{h.total_rooms}</strong>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-700 h-1.5 rounded-full"
                    style={{
                      width: `${h.total_capacity > 0 ? (h.total_occupied / h.total_capacity) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Rooms Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">All Rooms Inventory</h3>
            <DataTable
              data={rooms}
              loading={loading}
              searchPlaceholder="Filter rooms by number, hostel, floor..."
              columns={[
                {
                  header: 'Room Number',
                  accessor: (r: any) => <span className="font-mono font-bold text-slate-900">{r.room_number}</span>,
                },
                {
                  header: 'Hostel Block',
                  accessor: 'hostel_name',
                },
                {
                  header: 'Floor',
                  accessor: (r: any) => `Floor ${r.floor_number}`,
                },
                {
                  header: 'Occupancy / Capacity',
                  accessor: (r: any) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {r.current_occupancy} / {r.capacity} Beds
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                          r.status === 'Full'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : r.status === 'Maintenance'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Monthly Fee',
                  accessor: (r: any) => `₹ ${Number(r.monthly_fee).toLocaleString('en-IN')}`,
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 4: Room Allocations
      -------------------------------------------------------------- */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Room Allocations</h2>
              <p className="text-xs text-slate-500">
                Atomic room allotment with strict capacity validation & double-allocation prevention
              </p>
            </div>
            <button
              onClick={() => setIsAllocateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Allocate Student to Room
            </button>
          </div>

          <DataTable
            data={allocations}
            loading={loading}
            searchPlaceholder="Search allocations by student, code, or room..."
            columns={[
              {
                header: 'Allocation ID',
                accessor: (a: any) => <span className="font-mono text-slate-500">#{a.allocation_id}</span>,
              },
              {
                header: 'Student',
                accessor: (a: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{a.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{a.student_code}</div>
                  </div>
                ),
              },
              {
                header: 'Allocated Room',
                accessor: (a: any) => (
                  <div>
                    <span className="font-mono font-bold text-blue-900">Room {a.room_number}</span>
                    <div className="text-[11px] text-slate-500">{a.hostel_name}</div>
                  </div>
                ),
              },
              {
                header: 'Room Capacity',
                accessor: (a: any) => `${a.current_occupancy} / ${a.capacity} occupied`,
              },
              {
                header: 'Allotment Period',
                accessor: (a: any) => (
                  <div className="text-[11px]">
                    <div>Start: {a.start_date}</div>
                    {a.end_date && <div className="text-slate-400">End: {a.end_date}</div>}
                  </div>
                ),
              },
              {
                header: 'Status',
                accessor: (a: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      a.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {a.status}
                  </span>
                ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (a: any) =>
                  a.status === 'Active' ? (
                    <button
                      onClick={() => handleTerminateAllocation(a.allocation_id, a.student_name, a.room_number)}
                      className="px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition"
                      title="Terminate allotment and release bed"
                    >
                      Terminate
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Terminated</span>
                  ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 5: Fee Payments
      -------------------------------------------------------------- */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Fee Management</h2>
              <p className="text-xs text-slate-500">
                Track room accommodation fees, payments, bank references, and overdue balances
              </p>
            </div>
            <button
              onClick={() => setIsRecordFeeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Fee Payment
            </button>
          </div>

          <DataTable
            data={fees}
            loading={loading}
            searchPlaceholder="Search fee transactions by student name, code, or reference..."
            columns={[
              {
                header: 'Txn Ref',
                accessor: (f: any) => <span className="font-mono text-slate-800 font-medium">{f.transaction_reference}</span>,
              },
              {
                header: 'Student',
                accessor: (f: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{f.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{f.student_code}</div>
                  </div>
                ),
              },
              {
                header: 'Billing Month',
                accessor: 'billing_month',
              },
              {
                header: 'Amount Paid',
                accessor: (f: any) => (
                  <span className="font-semibold text-emerald-800">
                    ₹ {Number(f.amount_paid).toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                header: 'Due Amount',
                accessor: (f: any) => (
                  <span className={Number(f.due_amount) > 0 ? 'font-semibold text-rose-700' : 'text-slate-400'}>
                    ₹ {Number(f.due_amount).toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                header: 'Method',
                accessor: 'payment_method',
              },
              {
                header: 'Date',
                accessor: 'payment_date',
              },
              {
                header: 'Status',
                accessor: (f: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      f.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : f.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {f.status}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 6: Complaints Center
      -------------------------------------------------------------- */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Complaints & Grievances Center</h2>
              <p className="text-xs text-slate-500">
                Track student maintenance complaints, assign technical staff, and record resolutions
              </p>
            </div>
          </div>

          <DataTable
            data={complaints}
            loading={loading}
            searchPlaceholder="Search complaints by title, student, room..."
            columns={[
              {
                header: 'Complaint ID',
                accessor: (c: any) => <span className="font-mono text-slate-500">#{c.complaint_id}</span>,
              },
              {
                header: 'Student & Room',
                accessor: (c: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{c.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.student_code} • Room {c.room_number || 'N/A'}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Category & Title',
                accessor: (c: any) => (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{c.category}</span>
                    <div className="font-medium text-slate-800">{c.title}</div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{c.description}</p>
                  </div>
                ),
              },
              {
                header: 'Priority',
                accessor: (c: any) => (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                      c.priority === 'Urgent'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : c.priority === 'High'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {c.priority}
                  </span>
                ),
              },
              {
                header: 'Assigned Staff',
                accessor: (c: any) => c.assigned_staff_name ? (
                  <div>
                    <div className="font-medium text-slate-800">{c.assigned_staff_name}</div>
                    <div className="text-[10px] text-slate-500">{c.assigned_staff_role}</div>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                ),
              },
              {
                header: 'Status',
                accessor: (c: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      c.status === 'Resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {c.status}
                  </span>
                ),
              },
              {
                header: 'Action',
                className: 'text-right',
                accessor: (c: any) => (
                  <button
                    onClick={() => {
                      setSelectedComplaint(c);
                      setComplaintUpdateForm({
                        status: c.status,
                        staff_id: c.staff_id ? String(c.staff_id) : '',
                        resolution_remarks: c.resolution_remarks || '',
                      });
                      setIsComplaintModalOpen(true);
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition"
                  >
                    Update Status
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 7: Mess Management
      -------------------------------------------------------------- */}
      {activeTab === 'mess' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mess Halls & Catering Management</h2>
            <p className="text-xs text-slate-500">
              Mess vendors, dining timings, catering contracts, and dietary services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mess.map((m) => (
              <div key={m.mess_id} className="p-4 bg-white border border-slate-200 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {m.hostel_name}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                    Pure Veg Available
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{m.mess_name}</h3>
                <p className="text-xs text-slate-600">
                  <span className="text-slate-400">Caterer: </span>
                  <strong>{m.caterer_name}</strong>
                </p>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Breakfast:</span>
                    <span className="font-mono text-slate-700">{m.breakfast_timings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lunch:</span>
                    <span className="font-mono text-slate-700">{m.lunch_timings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dinner:</span>
                    <span className="font-mono text-slate-700">{m.dinner_timings}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Monthly Mess Fee:</span>
                  <strong className="text-slate-900">₹ {Number(m.monthly_mess_fee).toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Contact: <span className="font-mono">{m.contact_number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 8: Staff & Maintenance
      -------------------------------------------------------------- */}
      {activeTab === 'staff_maintenance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Staff & Maintenance Operations</h2>
              <p className="text-xs text-slate-500">
                Staff directory and physical hostel maintenance work orders
              </p>
            </div>
            <button
              onClick={() => setIsAddMaintenanceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Maintenance Ticket
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Hostel Staff Directory</h3>
            <DataTable
              data={staff}
              loading={loading}
              columns={[
                {
                  header: 'Staff ID',
                  accessor: (s: any) => <span className="font-mono text-slate-500">#{s.staff_id}</span>,
                },
                {
                  header: 'Staff Name',
                  accessor: (s: any) => <span className="font-semibold text-slate-900">{s.name}</span>,
                },
                {
                  header: 'Role',
                  accessor: (s: any) => (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      {s.role}
                    </span>
                  ),
                },
                {
                  header: 'Shift Timings',
                  accessor: 'shift_timing',
                },
                {
                  header: 'Contact Phone',
                  accessor: 'phone',
                },
                {
                  header: 'Assigned Hostel',
                  accessor: (s: any) => s.hostel_name || 'All Hostels',
                },
              ]}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Maintenance Records</h3>
            <DataTable
              data={maintenance}
              loading={loading}
              columns={[
                {
                  header: 'Ticket ID',
                  accessor: (m: any) => <span className="font-mono text-slate-500">#{m.maintenance_id}</span>,
                },
                {
                  header: 'Location',
                  accessor: (m: any) => (
                    <div>
                      <div className="font-semibold text-slate-900">{m.hostel_name}</div>
                      <div className="text-[11px] text-slate-500">Room: {m.room_number}</div>
                    </div>
                  ),
                },
                {
                  header: 'Issue & Description',
                  accessor: (m: any) => (
                    <div>
                      <div className="font-medium text-slate-800">{m.issue_type}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{m.description}</p>
                    </div>
                  ),
                },
                {
                  header: 'Assigned Technician',
                  accessor: (m: any) => `${m.assigned_staff_name} (${m.assigned_staff_role})`,
                },
                {
                  header: 'Cost',
                  accessor: (m: any) => `₹ ${Number(m.cost).toLocaleString('en-IN')}`,
                },
                {
                  header: 'Status',
                  accessor: (m: any) => (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        m.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {m.status}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 9: Security Oversight & Logs
      -------------------------------------------------------------- */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security & Gate Oversight</h2>
            <p className="text-xs text-slate-500">
              Audit student entry/exit activity, late-night curfew violations, and campus visitor history
            </p>
          </div>

          <DataTable
            data={securityLogs}
            loading={loading}
            searchPlaceholder="Search security logs by student, code, or gate..."
            columns={[
              {
                header: 'Log ID',
                accessor: (l: any) => <span className="font-mono text-slate-500">#{l.log_id}</span>,
              },
              {
                header: 'Student',
                accessor: (l: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{l.student_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {l.student_code} • Room {l.room_number || 'N/A'}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Event Type',
                accessor: (l: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                      l.event_type === 'Entry'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {l.event_type}
                  </span>
                ),
              },
              {
                header: 'Timestamp',
                accessor: (l: any) => <span className="font-mono text-slate-700">{l.event_time}</span>,
              },
              {
                header: 'Curfew Review Flag',
                accessor: (l: any) =>
                  Boolean(l.is_late_entry) ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      LATE NIGHT ENTRY
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Regular</span>
                  ),
              },
              {
                header: 'Destination / Reason',
                accessor: (l: any) => (
                  <div className="text-xs">
                    <div>{l.destination || '—'}</div>
                    <div className="text-[11px] text-slate-400">{l.reason || ''}</div>
                  </div>
                ),
              },
              {
                header: 'Duty Guard',
                accessor: 'logged_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Modal: Add Student
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Add New Student Record"
        subtitle="Registers a new hosteller into the MySQL Student table"
      >
        <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Student Roll / ID Code *</label>
              <input
                type="text"
                required
                value={studentForm.student_code}
                onChange={(e) => setStudentForm({ ...studentForm, student_code: e.target.value })}
                placeholder="e.g. STU202407"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Student full name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">College Email *</label>
              <input
                type="email"
                required
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="student@hostel.edu"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Emergency Contact *</label>
              <input
                type="tel"
                required
                value={studentForm.emergency_contact}
                onChange={(e) => setStudentForm({ ...studentForm, emergency_contact: e.target.value })}
                placeholder="Guardian phone number"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Department *</label>
              <input
                type="text"
                required
                value={studentForm.department}
                onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                placeholder="e.g. Computer Science & Eng"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Year of Study</label>
              <select
                value={studentForm.year_of_study}
                onChange={(e) => setStudentForm({ ...studentForm, year_of_study: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
              <select
                value={studentForm.blood_group}
                onChange={(e) => setStudentForm({ ...studentForm, blood_group: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
            >
              Save Student Record
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Edit Student
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isEditStudentOpen}
        onClose={() => setIsEditStudentOpen(false)}
        title="Edit Student Information"
        subtitle={selectedStudent ? `Updating ${selectedStudent.name} (${selectedStudent.student_code})` : ''}
      >
        {selectedStudent && (
          <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={selectedStudent.name}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={selectedStudent.email}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={selectedStudent.phone}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={selectedStudent.department}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, department: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Emergency Contact</label>
                <input
                  type="tel"
                  required
                  value={selectedStudent.emergency_contact}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, emergency_contact: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditStudentOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
              >
                Update Student
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Add Hostel
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isAddHostelOpen}
        onClose={() => setIsAddHostelOpen(false)}
        title="Add Hostel Block"
        subtitle="Registers a new campus residential building in the Hostel table"
      >
        <form onSubmit={handleAddHostel} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Hostel Block Name *</label>
            <input
              type="text"
              required
              value={hostelForm.hostel_name}
              onChange={(e) => setHostelForm({ ...hostelForm, hostel_name: e.target.value })}
              placeholder="e.g. Narmada Boys Hostel (Block D)"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Gender Specification</label>
              <select
                value={hostelForm.gender}
                onChange={(e) => setHostelForm({ ...hostelForm, gender: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Boys">Boys Hostel</option>
                <option value="Girls">Girls Hostel</option>
                <option value="Co-ed">Co-ed Facility</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Floors</label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={hostelForm.total_floors}
                onChange={(e) => setHostelForm({ ...hostelForm, total_floors: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Location / Address *</label>
            <input
              type="text"
              required
              value={hostelForm.address}
              onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
              placeholder="e.g. North Campus, Sector 4, University Grounds"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddHostelOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
            >
              Create Hostel
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Add Room
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        title="Add Room to Hostel"
        subtitle="Defines room number, bed capacity, floor, and monthly fee in Room table"
      >
        <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Hostel Block *</label>
            <select
              required
              value={roomForm.hostel_id}
              onChange={(e) => setRoomForm({ ...roomForm, hostel_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Hostel</option>
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>
                  {h.hostel_name} ({h.gender})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                placeholder="e.g. A-301"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Floor Number *</label>
              <input
                type="number"
                min="0"
                max="10"
                required
                value={roomForm.floor_number}
                onChange={(e) => setRoomForm({ ...roomForm, floor_number: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bed Capacity *</label>
              <input
                type="number"
                min="1"
                max="6"
                required
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Monthly Fee (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={roomForm.monthly_fee}
                onChange={(e) => setRoomForm({ ...roomForm, monthly_fee: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddRoomOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
            >
              Add Room
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Allocate Room
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        title="Allocate Room Bed to Student"
        subtitle="Executes transactional verification: prevents double allocation and over-capacity"
      >
        <form onSubmit={handleAllocateRoom} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Student to Allocate *</label>
            <select
              required
              value={allocationForm.student_id}
              onChange={(e) => setAllocationForm({ ...allocationForm, student_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Unallocated Student</option>
              {unallocatedStudents.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.student_code} • {s.department})
                </option>
              ))}
            </select>
            {unallocatedStudents.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                All existing students are currently allocated. Add a new student first to allocate them.
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Target Room (Available Beds) *</label>
            <select
              required
              value={allocationForm.room_id}
              onChange={(e) => setAllocationForm({ ...allocationForm, room_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Available Room</option>
              {availableRooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  Room {r.room_number} ({r.hostel_name}) — {r.current_occupancy}/{r.capacity} Occupied
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Allotment Start Date *</label>
              <input
                type="date"
                required
                value={allocationForm.start_date}
                onChange={(e) => setAllocationForm({ ...allocationForm, start_date: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Notes / Bed Allotment</label>
              <input
                type="text"
                value={allocationForm.notes}
                onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                placeholder="e.g. Allotted Bed 1"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAllocateOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!allocationForm.student_id || !allocationForm.room_id}
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900 disabled:opacity-40"
            >
              Confirm Allotment
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Record Fee Payment
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isRecordFeeOpen}
        onClose={() => setIsRecordFeeOpen(false)}
        title="Record Fee Payment Receipt"
        subtitle="Appends an audited payment record to the Fee_Payment table"
      >
        <form onSubmit={handleRecordFee} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Student Resident *</label>
            <select
              required
              value={feeForm.student_id}
              onChange={(e) => setFeeForm({ ...feeForm, student_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.student_code} • {s.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Amount Paid (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={feeForm.amount_paid}
                onChange={(e) => setFeeForm({ ...feeForm, amount_paid: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Remaining Due (₹)</label>
              <input
                type="number"
                step="0.01"
                value={feeForm.due_amount}
                onChange={(e) => setFeeForm({ ...feeForm, due_amount: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={feeForm.payment_method}
                onChange={(e) => setFeeForm({ ...feeForm, payment_method: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Online">Online / UPI</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Demand Draft">Demand Draft (DD)</option>
                <option value="Cash">Cash at Counter</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Month *</label>
              <input
                type="text"
                required
                value={feeForm.billing_month}
                onChange={(e) => setFeeForm({ ...feeForm, billing_month: e.target.value })}
                placeholder="e.g. October 2024"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Transaction Reference Number *</label>
            <input
              type="text"
              required
              value={feeForm.transaction_reference}
              onChange={(e) => setFeeForm({ ...feeForm, transaction_reference: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={feeForm.remarks}
              onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRecordFeeOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!feeForm.student_id}
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900 disabled:opacity-40"
            >
              Save Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Update Complaint Status
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        title="Update Complaint Resolution"
        subtitle={selectedComplaint ? `Complaint #${selectedComplaint.complaint_id}: ${selectedComplaint.title}` : ''}
      >
        {selectedComplaint && (
          <form onSubmit={handleUpdateComplaint} className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-800">
                {selectedComplaint.student_name} ({selectedComplaint.student_code}) • Room {selectedComplaint.room_number || 'N/A'}
              </div>
              <p className="text-slate-600 mt-1">{selectedComplaint.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={complaintUpdateForm.status}
                  onChange={(e) => setComplaintUpdateForm({ ...complaintUpdateForm, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Assign Staff</label>
                <select
                  value={complaintUpdateForm.staff_id}
                  onChange={(e) => setComplaintUpdateForm({ ...complaintUpdateForm, staff_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
                >
                  <option value="">Leave Unassigned</option>
                  {staff.map((st) => (
                    <option key={st.staff_id} value={st.staff_id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Resolution Remarks</label>
              <textarea
                rows={3}
                value={complaintUpdateForm.resolution_remarks}
                onChange={(e) => setComplaintUpdateForm({ ...complaintUpdateForm, resolution_remarks: e.target.value })}
                placeholder="Details of repairs or actions taken..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsComplaintModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
              >
                Update Complaint
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Add Maintenance Ticket
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isAddMaintenanceOpen}
        onClose={() => setIsAddMaintenanceOpen(false)}
        title="Schedule Hostel Maintenance Ticket"
        subtitle="Creates a maintenance work order in the Maintenance table"
      >
        <form onSubmit={handleAddMaintenance} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Hostel Block *</label>
              <select
                required
                value={maintForm.hostel_id}
                onChange={(e) => setMaintForm({ ...maintForm, hostel_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="">Select Hostel</option>
                {hostels.map((h) => (
                  <option key={h.hostel_id} value={h.hostel_id}>
                    {h.hostel_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room (Optional)</label>
              <select
                value={maintForm.room_id}
                onChange={(e) => setMaintForm({ ...maintForm, room_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="">Common Area / Non-Room</option>
                {rooms
                  .filter((r) => !maintForm.hostel_id || r.hostel_id === Number(maintForm.hostel_id))
                  .map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      Room {r.room_number}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Issue Type / Work Summary *</label>
            <input
              type="text"
              required
              value={maintForm.issue_type}
              onChange={(e) => setMaintForm({ ...maintForm, issue_type: e.target.value })}
              placeholder="e.g. Corridor Light Fixture Replacement"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description *</label>
            <textarea
              rows={2}
              required
              value={maintForm.description}
              onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              placeholder="Detailed description of repair needed..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Assign Staff</label>
              <select
                value={maintForm.assigned_staff_id}
                onChange={(e) => setMaintForm({ ...maintForm, assigned_staff_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="">Unassigned</option>
                {staff.map((st) => (
                  <option key={st.staff_id} value={st.staff_id}>
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddMaintenanceOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
