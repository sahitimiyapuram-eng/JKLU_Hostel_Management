import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  DoorOpen,
  ClipboardList,
  Search,
  Plus,
  LogOut,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Phone,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { StatCard } from '../components/StatCard.js';

interface GuardDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: any;
}

export const GuardDashboard: React.FC<GuardDashboardProps> = ({
  activeTab,
  onTabChange,
  currentUser,
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<any | null>(null);

  const [visits, setVisits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [lateEntries, setLateEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isGateLogModalOpen, setIsGateLogModalOpen] = useState(false);

  // Forms
  const [visitorForm, setVisitorForm] = useState({
    full_name: '',
    phone: '',
    id_proof_type: 'Aadhaar',
    id_proof_number: '',
    address: '',
    student_id: '',
    hostel_id: '1',
    relation_to_student: 'Parent / Guardian',
    purpose: 'Routine Campus Visit',
  });

  const [gateLogForm, setGateLogForm] = useState({
    student_id: '',
    event_type: 'Exit',
    destination: 'Library / Local Market',
    reason: 'Academic / Personal',
    is_late_entry: false,
  });

  const loadGuardData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiRequest('/guard/students/search'),
        apiRequest('/guard/visitors'),
        apiRequest('/guard/security-logs'),
        apiRequest('/jklu/registers/security-handover'),
        apiRequest('/jklu/registers/late-night'),
      ]);

      const [studentsRes, visitsRes, logsRes, handoverRes, lateRes] = results;

      if (studentsRes.status === 'fulfilled' && studentsRes.value?.success) setStudents(studentsRes.value.students || []);
      if (visitsRes.status === 'fulfilled' && visitsRes.value?.success) setVisits(visitsRes.value.visits || []);
      if (logsRes.status === 'fulfilled' && logsRes.value?.success) setLogs(logsRes.value.logs || []);
      if (handoverRes.status === 'fulfilled' && handoverRes.value?.success) setHandovers(handoverRes.value.records || []);
      if (lateRes.status === 'fulfilled' && lateRes.value?.success) setLateEntries(lateRes.value.records || []);
    } catch (err: any) {
      console.warn('Error fetching guard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuardData();
  }, [activeTab]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Quick lookup search
  const handleStudentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSearchQuery.trim()) return;
    const query = studentSearchQuery.toLowerCase().trim();
    const match = students.find(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.student_code.toLowerCase().includes(query) ||
        s.phone.includes(query)
    );
    if (match) {
      setSearchedStudent(match);
    } else {
      setSearchedStudent(null);
      showNotification('error', `No student found matching query "${studentSearchQuery}"`);
    }
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/guard/visitors/register-visit', 'POST', visitorForm);
      if (res.success) {
        showNotification('success', res.message || 'Visitor checked in successfully');
        setIsVisitorModalOpen(false);
        setVisitorForm({
          full_name: '',
          phone: '',
          id_proof_type: 'Aadhaar',
          id_proof_number: '',
          address: '',
          student_id: '',
          hostel_id: '1',
          relation_to_student: 'Parent / Guardian',
          purpose: 'Routine Campus Visit',
        });
        loadGuardData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to register visitor');
    }
  };

  const handleCheckoutVisitor = async (visitId: number, visitorName: string) => {
    try {
      const res = await apiRequest(`/guard/visitors/${visitId}/checkout`, 'POST');
      if (res.success) {
        showNotification('success', `Visitor ${visitorName} marked checked out successfully`);
        loadGuardData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to check out visitor');
    }
  };

  const handleCreateGateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/guard/security-logs', 'POST', gateLogForm);
      if (res.success) {
        showNotification('success', res.message || 'Student movement logged');
        setIsGateLogModalOpen(false);
        setGateLogForm({
          student_id: '',
          event_type: 'Exit',
          destination: 'Library / Local Market',
          reason: 'Academic / Personal',
          is_late_entry: false,
        });
        loadGuardData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to log student movement');
    }
  };

  const activeVisitorsInside = visits.filter((v) => v.status === 'Inside');
  const lateEntriesCount = logs.filter((l) => Boolean(l.is_late_entry)).length;

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
          Dashboard Master Overview (Gate Status)
      -------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Security Gate Control Dashboard</h2>
              <p className="text-xs text-slate-500">
                Gate 1 entry/exit checkpoint, live visitor tracking, and curfew oversight
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVisitorModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Visitor
              </button>
              <button
                onClick={() => setIsGateLogModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-xs transition"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                Log Movement
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Visitors Inside"
              value={activeVisitorsInside.length}
              subtitle="Guests currently on premises"
              icon={UserCheck}
              badge={activeVisitorsInside.length > 0 ? 'Inside Campus' : 'Clear'}
              badgeColor={activeVisitorsInside.length > 0 ? 'blue' : 'green'}
            />
            <StatCard
              title="Total Guest Visits"
              value={visits.length}
              subtitle="All registered entries"
              icon={ClipboardList}
              badge="Audited"
              badgeColor="green"
            />
            <StatCard
              title="Student Movements"
              value={logs.length}
              subtitle="Gate passes logged"
              icon={DoorOpen}
              badge="Active"
              badgeColor="blue"
            />
            <StatCard
              title="Curfew Violations"
              value={lateEntries.length || lateEntriesCount}
              subtitle="Entries after 09:30 PM"
              icon={AlertCircle}
              badge={(lateEntries.length || lateEntriesCount) > 0 ? 'Flagged' : 'None'}
              badgeColor={(lateEntries.length || lateEntriesCount) > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Quick Student Verification Box */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Quick Student Verification
                </h3>
                <p className="text-[11px] text-slate-500">Search student code or name to instantly verify hostel and room allotment</p>
              </div>
            </div>
            <form onSubmit={handleStudentSearch} className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Enter Student Code (e.g. 2025Btech224) or Name..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-700"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded text-xs font-semibold shadow-xs transition"
              >
                Verify Student
              </button>
            </form>

            {searchedStudent && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-2 mt-3 max-w-xl">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{searchedStudent.name}</div>
                  <span className="font-mono text-red-900 font-bold">{searchedStudent.student_code}</span>
                </div>
                <div className="text-slate-600">
                  Allotted: <strong>{searchedStudent.hostel_name || searchedStudent.hostel_code}</strong> • Room {searchedStudent.room_number}
                </div>
                <div className="text-slate-500 text-[11px]">Emergency: {searchedStudent.emergency_contact}</div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setGateLogForm((prev) => ({ ...prev, student_id: String(searchedStudent.student_id), event_type: 'Exit' }));
                      setIsGateLogModalOpen(true);
                    }}
                    className="px-3 py-1 bg-slate-800 text-white rounded text-xs font-medium"
                  >
                    Log Exit
                  </button>
                  <button
                    onClick={() => {
                      setGateLogForm((prev) => ({ ...prev, student_id: String(searchedStudent.student_id), event_type: 'Entry' }));
                      setIsGateLogModalOpen(true);
                    }}
                    className="px-3 py-1 bg-red-800 text-white rounded text-xs font-medium"
                  >
                    Log Entry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Visitors Currently Inside Preview */}
          {activeVisitorsInside.length > 0 && (
            <div className="p-4 bg-red-50/40 border border-red-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-red-800" />
                  Active Visitors on Campus ({activeVisitorsInside.length})
                </h3>
                <button
                  onClick={() => onTabChange('visitors')}
                  className="text-xs text-red-800 font-bold hover:underline"
                >
                  View All Visitors
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeVisitorsInside.map((v) => (
                  <div key={v.visit_id} className="p-3 bg-white border border-slate-200 rounded text-xs space-y-2 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{v.visitor_name}</div>
                        <div className="text-[11px] text-slate-500">{v.relation_to_student} of {v.student_name}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        Inside
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Check-in: <span className="font-mono">{v.check_in}</span></div>
                      <div>Hostel: {v.hostel_name} (Room {v.room_number || 'N/A'})</div>
                    </div>
                    <button
                      onClick={() => handleCheckoutVisitor(v.visit_id, v.visitor_name)}
                      className="w-full py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                    >
                      Record Check Out
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 1: Student Lookup
      -------------------------------------------------------------- */}
      {(activeTab === 'students' || activeTab === 'student_lookup') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-serif">Student Identity Verification</h2>
            <p className="text-xs text-slate-500">
              Quick search by student Roll Number, ID code, or name to verify hostel allotment and emergency contacts
            </p>
          </div>

          {/* Quick Search Box */}
          <form onSubmit={handleStudentSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Enter Student Code (e.g. STU202401) or Name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-semibold shadow-xs transition"
            >
              Verify Student
            </button>
          </form>

          {/* Verified Student Details Card */}
          {searchedStudent && (
            <div className="p-5 bg-white border border-slate-200 rounded-md shadow-xs max-w-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-900">
                    {searchedStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{searchedStudent.name}</h3>
                    <div className="text-xs font-mono text-slate-500">{searchedStudent.student_code}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {searchedStudent.department}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">Year {searchedStudent.year_of_study}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-400">Allotted Accommodation:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {searchedStudent.hostel_name} • Room {searchedStudent.room_number}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Blood Group:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{searchedStudent.blood_group || 'O+'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Student Phone:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{searchedStudent.phone}</div>
                </div>
                <div>
                  <span className="text-slate-400">Emergency / Parent Contact:</span>
                  <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {searchedStudent.emergency_contact}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGateLogForm((prev) => ({
                      ...prev,
                      student_id: String(searchedStudent.student_id),
                      event_type: 'Exit',
                    }));
                    setIsGateLogModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition"
                >
                  Log Gate Exit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGateLogForm((prev) => ({
                      ...prev,
                      student_id: String(searchedStudent.student_id),
                      event_type: 'Entry',
                    }));
                    setIsGateLogModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-3 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-medium transition"
                >
                  Log Gate Entry
                </button>
              </div>
            </div>
          )}

          {/* All Enrolled Students Reference Table */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Enrolled Students Index</h3>
            <DataTable
              data={students}
              loading={loading}
              searchPlaceholder="Filter enrolled students..."
              columns={[
                {
                  header: 'Student Code',
                  accessor: (s: any) => <span className="font-mono font-medium text-slate-900">{s.student_code}</span>,
                },
                {
                  header: 'Name',
                  accessor: (s: any) => <span className="font-semibold text-slate-900">{s.name}</span>,
                },
                {
                  header: 'Allotted Room',
                  accessor: (s: any) => (
                    <span className="text-blue-900 font-medium">
                      {s.hostel_name} • Room {s.room_number}
                    </span>
                  ),
                },
                {
                  header: 'Department',
                  accessor: 'department',
                },
                {
                  header: 'Emergency Contact',
                  accessor: 'emergency_contact',
                },
                {
                  header: 'Action',
                  className: 'text-right',
                  accessor: (s: any) => (
                    <button
                      onClick={() => setSearchedStudent(s)}
                      className="px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-50 rounded border border-blue-200"
                    >
                      Inspect
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 2: Visitor Desk
      -------------------------------------------------------------- */}
      {activeTab === 'visitor_desk' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hostel Visitor Registration & Desk</h2>
              <p className="text-xs text-slate-500">
                Register incoming campus guests, record identity proof, and track checkout status
              </p>
            </div>
            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Register New Visitor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Visitors Currently Inside"
              value={activeVisitorsInside.length}
              subtitle="Guests currently on premises"
              icon={UserCheck}
              badge={activeVisitorsInside.length > 0 ? 'Inside Campus' : 'None'}
              badgeColor="blue"
            />
            <StatCard
              title="Total Visits Recorded"
              value={visits.length}
              subtitle="Total checked-in guest entries"
              icon={ClipboardList}
              badge="Audited"
              badgeColor="green"
            />
          </div>

          {/* Visitors Currently Inside Card List */}
          {activeVisitorsInside.length > 0 && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-md space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-800" />
                Active Visitors on Campus ({activeVisitorsInside.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeVisitorsInside.map((v) => (
                  <div key={v.visit_id} className="p-3 bg-white border border-slate-200 rounded text-xs space-y-2 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{v.visitor_name}</div>
                        <div className="text-[11px] text-slate-500">{v.relation_to_student} of {v.student_name}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        Inside
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>ID: {v.id_proof_type} ({v.id_proof_number})</div>
                      <div>Check-in: <span className="font-mono">{v.check_in}</span></div>
                      <div>Hostel: {v.hostel_name} (Room {v.room_number || 'N/A'})</div>
                    </div>

                    <button
                      onClick={() => handleCheckoutVisitor(v.visit_id, v.visitor_name)}
                      className="w-full py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                    >
                      Record Check Out
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Visits History Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Visitor Gate Log</h3>
            <DataTable
              data={visits}
              loading={loading}
              searchPlaceholder="Search visitor history..."
              columns={[
                {
                  header: 'Visitor Details',
                  accessor: (v: any) => (
                    <div>
                      <div className="font-semibold text-slate-900">{v.visitor_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {v.id_proof_type}: {v.id_proof_number} • Ph: {v.visitor_phone}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Student Visited',
                  accessor: (v: any) => (
                    <div>
                      <div className="font-medium text-slate-800">{v.student_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {v.relation_to_student} • Room {v.room_number || 'N/A'}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Purpose',
                  accessor: 'purpose',
                },
                {
                  header: 'Check-In',
                  accessor: (v: any) => <span className="font-mono text-slate-700">{v.check_in}</span>,
                },
                {
                  header: 'Check-Out',
                  accessor: (v: any) => v.check_out ? (
                    <span className="font-mono text-slate-700">{v.check_out}</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Inside
                    </span>
                  ),
                },
                {
                  header: 'Action',
                  className: 'text-right',
                  accessor: (v: any) => v.status === 'Inside' ? (
                    <button
                      onClick={() => handleCheckoutVisitor(v.visit_id, v.visitor_name)}
                      className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200"
                    >
                      Check Out
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">Completed</span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 3: Gate In/Out Pass
      -------------------------------------------------------------- */}
      {activeTab === 'gate_pass' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Gate Movement Control</h2>
              <p className="text-xs text-slate-500">
                Record student daily entry & exit with automatic late-night curfew violation detection
              </p>
            </div>
            <button
              onClick={() => setIsGateLogModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              Log Student Movement
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Movements Logged"
              value={logs.length}
              subtitle="Gate passes recorded in database"
              icon={DoorOpen}
              badge="Audited"
              badgeColor="blue"
            />
            <StatCard
              title="Flagged Late-Night Entries"
              value={lateEntriesCount}
              subtitle="Entries after 09:30 PM curfew"
              icon={AlertCircle}
              badge={lateEntriesCount > 0 ? 'Curfew Violations' : 'None'}
              badgeColor={lateEntriesCount > 0 ? 'red' : 'green'}
            />
          </div>

          <DataTable
            data={logs}
            loading={loading}
            searchPlaceholder="Search movement logs by student, code, or destination..."
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
                header: 'Movement',
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
                header: 'Curfew Status',
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
                header: 'Destination & Reason',
                accessor: (l: any) => (
                  <div className="text-xs">
                    <div className="font-medium text-slate-800">{l.destination || '—'}</div>
                    <div className="text-[11px] text-slate-400">{l.reason || ''}</div>
                  </div>
                ),
              },
              {
                header: 'Officer on Duty',
                accessor: 'logged_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 4: Security Movement Logs
      -------------------------------------------------------------- */}
      {activeTab === 'security_logs' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security Movement Master Log</h2>
            <p className="text-xs text-slate-500">
              Complete chronological audit trail stored in the Security_Log MySQL table
            </p>
          </div>

          <DataTable
            data={logs}
            loading={loading}
            searchPlaceholder="Search log audit trail..."
            columns={[
              {
                header: 'Log #',
                accessor: (l: any) => <span className="font-mono text-slate-500">#{l.log_id}</span>,
              },
              {
                header: 'Student Resident',
                accessor: (l: any) => `${l.student_name} (${l.student_code})`,
              },
              {
                header: 'Event',
                accessor: 'event_type',
              },
              {
                header: 'Time',
                accessor: 'event_time',
              },
              {
                header: 'Late Entry Flag',
                accessor: (l: any) => Boolean(l.is_late_entry) ? 'YES (FLAGGED)' : 'NO',
              },
              {
                header: 'Destination / Remarks',
                accessor: (l: any) => `${l.destination || ''} - ${l.reason || ''}`,
              },
              {
                header: 'Guard',
                accessor: 'logged_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Modal: Register Visitor
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        title="Register Campus Visitor"
        subtitle="Records visitor identification and checks them into the hostel"
      >
        <form onSubmit={handleRegisterVisitor} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Visitor Full Name *</label>
              <input
                type="text"
                required
                value={visitorForm.full_name}
                onChange={(e) => setVisitorForm({ ...visitorForm, full_name: e.target.value })}
                placeholder="Full legal name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Visitor Phone Number *</label>
              <input
                type="tel"
                required
                value={visitorForm.phone}
                onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                placeholder="10-digit phone"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">ID Proof Type *</label>
              <select
                value={visitorForm.id_proof_type}
                onChange={(e) => setVisitorForm({ ...visitorForm, id_proof_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="Driver License">Driver License</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
                <option value="College ID">College ID</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">ID Proof Number *</label>
              <input
                type="text"
                required
                value={visitorForm.id_proof_number}
                onChange={(e) => setVisitorForm({ ...visitorForm, id_proof_number: e.target.value })}
                placeholder="e.g. 9988-7766-5544"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Student to Visit *</label>
            <select
              required
              value={visitorForm.student_id}
              onChange={(e) => setVisitorForm({ ...visitorForm, student_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Enrolled Student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.student_code} • {s.hostel_name} Room {s.room_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Relation to Student *</label>
              <input
                type="text"
                required
                value={visitorForm.relation_to_student}
                onChange={(e) => setVisitorForm({ ...visitorForm, relation_to_student: e.target.value })}
                placeholder="e.g. Father, Mother, Brother"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Purpose of Visit *</label>
              <input
                type="text"
                required
                value={visitorForm.purpose}
                onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                placeholder="e.g. Delivering books/medicines"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Visitor Address (Optional)</label>
            <input
              type="text"
              value={visitorForm.address}
              onChange={(e) => setVisitorForm({ ...visitorForm, address: e.target.value })}
              placeholder="Residential city / address"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsVisitorModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!visitorForm.student_id}
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900 disabled:opacity-40"
            >
              Check In Visitor
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          Modal: Log Gate Movement
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isGateLogModalOpen}
        onClose={() => setIsGateLogModalOpen(false)}
        title="Log Student Gate Movement"
        subtitle="Records Entry or Exit at campus gate with curfew rule checking"
      >
        <form onSubmit={handleCreateGateLog} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Student *</label>
            <select
              required
              value={gateLogForm.student_id}
              onChange={(e) => setGateLogForm({ ...gateLogForm, student_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.student_code} • {s.hostel_name} Room {s.room_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Movement Type *</label>
              <select
                value={gateLogForm.event_type}
                onChange={(e) => setGateLogForm({ ...gateLogForm, event_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Exit">Exit (Leaving Campus)</option>
                <option value="Entry">Entry (Returning to Campus)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Destination / Origin</label>
              <input
                type="text"
                value={gateLogForm.destination}
                onChange={(e) => setGateLogForm({ ...gateLogForm, destination: e.target.value })}
                placeholder="e.g. Central Library / City Center"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason / Purpose</label>
            <input
              type="text"
              value={gateLogForm.reason}
              onChange={(e) => setGateLogForm({ ...gateLogForm, reason: e.target.value })}
              placeholder="e.g. Academic project / Grocery"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gateLogForm.is_late_entry}
                onChange={(e) => setGateLogForm({ ...gateLogForm, is_late_entry: e.target.checked })}
                className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
              />
              <span className="font-semibold text-amber-900">
                Flag as Late Night Entry (Curfew Violation Review)
              </span>
            </label>
            <p className="text-[11px] text-amber-700 mt-1 pl-5">
              Hostel curfew is 09:30 PM. Entries after 09:30 PM are automatically flagged and reported on the Warden dashboard.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGateLogModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!gateLogForm.student_id}
              className="px-4 py-1.5 bg-blue-800 text-white rounded font-medium hover:bg-blue-900 disabled:opacity-40"
            >
              Save Gate Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
