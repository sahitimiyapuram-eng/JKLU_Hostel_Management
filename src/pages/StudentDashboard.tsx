import React, { useState, useEffect } from 'react';
import {
  User,
  BedDouble,
  CreditCard,
  AlertCircle,
  Plus,
  UtensilsCrossed,
  UserCheck,
  DoorOpen,
  Phone,
  Building,
  CheckCircle,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { StatCard } from '../components/StatCard.js';

interface StudentDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: any;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  activeTab,
  onTabChange,
  currentUser,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [mess, setMess] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Complaint Modal
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    category: 'Electrical',
    title: '',
    description: '',
    priority: 'Medium',
  });

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiRequest('/student/profile'),
        apiRequest('/student/room'),
        apiRequest('/student/fees'),
        apiRequest('/student/complaints'),
        apiRequest('/student/mess'),
        apiRequest('/student/visitors'),
        apiRequest('/student/security-logs'),
      ]);

      const [profRes, roomRes, feeRes, compRes, messRes, visRes, logRes] = results;

      if (profRes.status === 'fulfilled' && profRes.value?.success) setProfile(profRes.value.profile);
      if (roomRes.status === 'fulfilled' && roomRes.value?.success) setRoom(roomRes.value.room);
      if (feeRes.status === 'fulfilled' && feeRes.value?.success) {
        setFees(feeRes.value.fees || []);
        setFeeSummary(feeRes.value.summary || null);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.success) setComplaints(compRes.value.complaints || []);
      if (messRes.status === 'fulfilled' && messRes.value?.success) setMess(messRes.value.mess || []);
      if (visRes.status === 'fulfilled' && visRes.value?.success) setVisitors(visRes.value.visitors || []);
      if (logRes.status === 'fulfilled' && logRes.value?.success) setLogs(logRes.value.logs || []);
    } catch (err: any) {
      console.warn('Error syncing student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [activeTab]);

  const handleFileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/student/complaints', 'POST', complaintForm);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Complaint lodged successfully! The warden has been notified.' });
        setIsComplaintModalOpen(false);
        setComplaintForm({ category: 'Electrical', title: '', description: '', priority: 'Medium' });
        loadStudentData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit complaint' });
    }
  };

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
          Tab 1: Profile & Allotted Room
      -------------------------------------------------------------- */}
      {(activeTab === 'dashboard' || activeTab === 'profile_room' || activeTab === 'rooms') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                {activeTab === 'rooms' ? 'My Allotted Room & Bed' : 'Student Profile & Accommodation'}
              </h2>
              <p className="text-xs text-slate-500">
                Personal academic records and currently allocated hostel room
              </p>
            </div>
            <button
              onClick={() => setIsComplaintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              File Maintenance Grievance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Personal Profile Card */}
            <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-base">
                  {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{profile?.name || currentUser.name}</h3>
                  <div className="text-xs font-mono text-slate-500">{profile?.student_code || currentUser.student_code}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-medium text-slate-800">{profile?.department || '—'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Year of Study:</span>
                    <div className="font-medium text-slate-800">Year {profile?.year_of_study || 1}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Blood Group:</span>
                    <div className="font-medium text-slate-800">{profile?.blood_group || 'O+'}</div>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">College Email:</span>
                  <div className="font-medium text-slate-800">{profile?.email || currentUser.email}</div>
                </div>
                <div>
                  <span className="text-slate-400">Contact Number:</span>
                  <div className="font-medium text-slate-800">{profile?.phone || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Emergency / Guardian Contact:</span>
                  <div className="font-medium text-slate-800">{profile?.emergency_contact || '—'}</div>
                </div>
              </div>
            </div>

            {/* Room Allocation Card */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-blue-800" />
                  <h3 className="text-sm font-bold text-slate-900">Current Room Allotment</h3>
                </div>
                {room ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE ALLOCATION
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    NOT ALLOTTED
                  </span>
                )}
              </div>

              {room ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400">Room Number</span>
                      <div className="text-base font-mono font-bold text-blue-900">Room {room.room_number}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Hostel Block</span>
                      <div className="font-semibold text-slate-800">{room.hostel_name}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Floor Level</span>
                      <div className="font-semibold text-slate-800">Floor {room.floor_number}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Monthly Rent</span>
                      <div className="font-semibold text-slate-800">₹ {Number(room.monthly_fee).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="p-3 border border-slate-200 rounded bg-white text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hostel Administration</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-600">Supervising Warden: </span>
                        <strong>{room.warden_name || 'Dr. Ramesh Kumar'}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{room.warden_phone || '9876543210'}</span>
                      </div>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Office: {room.warden_office || 'Admin Block Ground Floor Rm 102'}
                    </div>
                  </div>

                  {/* Roommates Section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Roommates in Room {room.room_number}
                    </h4>
                    {room.roommates && room.roommates.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {room.roommates.map((rm: any) => (
                          <div key={rm.student_id} className="p-3 border border-slate-200 rounded bg-slate-50/50 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{rm.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{rm.student_code} • {rm.department}</div>
                            </div>
                            <div className="text-slate-500 text-[11px]">Yr {rm.year_of_study}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No other roommates assigned to this room yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <BedDouble className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="font-semibold text-slate-700">No Active Room Allocation</p>
                  <p className="mt-1">
                    Please contact the Hostel Warden office to obtain your room and bed allocation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 2: Fee Dues & Receipts
      -------------------------------------------------------------- */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hostel Accommodation Fees</h2>
            <p className="text-xs text-slate-500">
              Personal ledger of accommodation fee dues and verified payment transactions
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Fees Paid"
              value={`₹ ${Number(feeSummary?.totalPaid || 0).toLocaleString('en-IN')}`}
              subtitle="Verified tuition and room payments"
              icon={CreditCard}
              badge="Cleared"
              badgeColor="green"
            />
            <StatCard
              title="Outstanding Balance Due"
              value={`₹ ${Number(feeSummary?.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle={feeSummary?.hasOutstandingDues ? 'Please clear with warden' : 'All accounts settled'}
              icon={CreditCard}
              badge={feeSummary?.hasOutstandingDues ? 'Payment Due' : 'No Dues'}
              badgeColor={feeSummary?.hasOutstandingDues ? 'red' : 'green'}
            />
          </div>

          <DataTable
            data={fees}
            loading={loading}
            emptyMessage="No fee payments recorded for your student account."
            columns={[
              {
                header: 'Transaction Ref',
                accessor: (f: any) => <span className="font-mono font-medium text-slate-900">{f.transaction_reference}</span>,
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
                header: 'Remaining Due',
                accessor: (f: any) => (
                  <span className={Number(f.due_amount) > 0 ? 'font-semibold text-rose-700' : 'text-slate-400'}>
                    ₹ {Number(f.due_amount).toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                header: 'Payment Method',
                accessor: 'payment_method',
              },
              {
                header: 'Date Paid',
                accessor: 'payment_date',
              },
              {
                header: 'Status',
                accessor: (f: any) => (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      f.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {f.status}
                  </span>
                ),
              },
              {
                header: 'Remarks',
                accessor: 'remarks',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 3: Complaints & Requests
      -------------------------------------------------------------- */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Maintenance Grievances & Service Requests</h2>
              <p className="text-xs text-slate-500">
                Submit complaints for electrical, plumbing, carpentry, Wi-Fi, or room repairs
              </p>
            </div>
            <button
              onClick={() => setIsComplaintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              File New Complaint
            </button>
          </div>

          <DataTable
            data={complaints}
            loading={loading}
            emptyMessage="You have not submitted any complaints."
            columns={[
              {
                header: 'Complaint ID',
                accessor: (c: any) => <span className="font-mono text-slate-500">#{c.complaint_id}</span>,
              },
              {
                header: 'Category',
                accessor: (c: any) => (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {c.category}
                  </span>
                ),
              },
              {
                header: 'Issue Title & Details',
                accessor: (c: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
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
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
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
                header: 'Technician Assigned',
                accessor: (c: any) => c.assigned_staff_name || <span className="text-slate-400 italic">Pending Assignment</span>,
              },
              {
                header: 'Resolution Remarks',
                accessor: (c: any) => (
                  <span className="text-slate-600 text-[11px]">
                    {c.resolution_remarks || <span className="text-slate-400 italic">Awaiting resolution</span>}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 4: Mess Schedule & Timings
      -------------------------------------------------------------- */}
      {activeTab === 'mess' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hostel Mess Timings & Details</h2>
            <p className="text-xs text-slate-500">
              Dining hours, caterer contacts, and meal schedules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mess.map((m) => (
              <div key={m.mess_id} className="p-5 bg-white border border-slate-200 rounded-md space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-blue-800" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{m.mess_name}</h3>
                      <div className="text-[11px] text-slate-500">{m.hostel_name}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                    Veg & Non-Veg
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">Breakfast Timings:</span>
                    <span className="font-mono text-slate-800 font-semibold">{m.breakfast_timings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">Lunch Timings:</span>
                    <span className="font-mono text-slate-800 font-semibold">{m.lunch_timings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">Dinner Timings:</span>
                    <span className="font-mono text-slate-800 font-semibold">{m.dinner_timings}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div>
                    <span className="text-slate-400">Catering Contractor: </span>
                    <strong className="text-slate-800">{m.caterer_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Mess Helpline / Queries: </span>
                    <span className="font-mono text-slate-800">{m.contact_number}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 5: Visitors
      -------------------------------------------------------------- */}
      {activeTab === 'visitors' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Visitors Log</h2>
            <p className="text-xs text-slate-500">
              Log of parents, guardians, and guests registered at security gate to meet you
            </p>
          </div>

          <DataTable
            data={visitors}
            loading={loading}
            emptyMessage="No visitors have registered to visit your room yet."
            columns={[
              {
                header: 'Visitor Name',
                accessor: (v: any) => (
                  <div>
                    <div className="font-semibold text-slate-900">{v.visitor_name}</div>
                    <div className="text-[11px] text-slate-500">Phone: {v.visitor_phone}</div>
                  </div>
                ),
              },
              {
                header: 'Relation',
                accessor: 'relation_to_student',
              },
              {
                header: 'Purpose',
                accessor: 'purpose',
              },
              {
                header: 'Check-In Time',
                accessor: (v: any) => <span className="font-mono text-slate-700">{v.check_in}</span>,
              },
              {
                header: 'Check-Out Time',
                accessor: (v: any) => v.check_out ? (
                  <span className="font-mono text-slate-700">{v.check_out}</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Currently Inside
                  </span>
                ),
              },
              {
                header: 'Gate Officer',
                accessor: 'guard_name',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Tab 6: Entry / Exit Logs
      -------------------------------------------------------------- */}
      {(activeTab === 'student_out_register' || activeTab === 'gate_logs') && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-serif">My Gate Movement Logs & Out-Passes</h2>
            <p className="text-xs text-slate-500">
              Personal gate pass records, out-pass tracking, and curfew audit logs
            </p>
          </div>

          <DataTable
            data={logs}
            loading={loading}
            emptyMessage="No gate entries or exits recorded."
            columns={[
              {
                header: 'Log ID',
                accessor: (l: any) => <span className="font-mono text-slate-500">#{l.log_id}</span>,
              },
              {
                header: 'Event',
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
                header: 'Curfew Flag',
                accessor: (l: any) =>
                  Boolean(l.is_late_entry) ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      Late Entry Flagged
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Regular</span>
                  ),
              },
              {
                header: 'Destination',
                accessor: 'destination',
              },
              {
                header: 'Reason',
                accessor: 'reason',
              },
              {
                header: 'Logged By Guard',
                accessor: 'logged_by',
              },
            ]}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          Modal: File Grievance / Complaint
      -------------------------------------------------------------- */}
      <Modal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        title="Submit Hostel Grievance / Complaint"
        subtitle="This request will be logged in the MySQL Complaint table and routed to the Warden"
      >
        <form onSubmit={handleFileComplaint} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Issue Category *</label>
              <select
                value={complaintForm.category}
                onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Electrical">Electrical (Fan, Light, Switch)</option>
                <option value="Plumbing">Plumbing (Tap, Leakage, Drainage)</option>
                <option value="Carpentry">Carpentry (Bed, Table, Door lock)</option>
                <option value="Cleaning">Housekeeping & Cleaning</option>
                <option value="Wi-Fi/Internet">Wi-Fi & LAN Network</option>
                <option value="Mess Food">Mess Food & Water</option>
                <option value="Discipline">Discipline / Noise</option>
                <option value="Other">Other Issues</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priority Level</label>
              <select
                value={complaintForm.priority}
                onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Low">Low (Informational)</option>
                <option value="Medium">Medium (Standard 48hr repair)</option>
                <option value="High">High (Needs immediate attention)</option>
                <option value="Urgent">Urgent (Hazard / Emergency)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Complaint Subject / Title *</label>
            <input
              type="text"
              required
              value={complaintForm.title}
              onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
              placeholder="e.g. Washroom flush button jammed in Room A-101"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              rows={3}
              required
              value={complaintForm.description}
              onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
              placeholder="Describe the issue, specific bed or location, and when it started..."
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
              Submit Complaint
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
