import React from 'react';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  AlertCircle,
  Sparkles,
  UserCheck,
  DoorOpen,
  Clock,
  Wrench,
  Shield,
  UtensilsCrossed,
  LogOut,
  Building,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  role: string;
  assignedHostel?: string | null;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
  selectedHostelFilter?: string | null;
  onHostelFilterChange?: (hostel: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  assignedHostel,
  activeTab,
  onTabChange,
  onLogout,
  selectedHostelFilter,
  onHostelFilterChange,
}) => {
  const isChiefWarden = role === 'Chief Warden';
  const isStudent = role === 'Student';
  const isGuard = role === 'Security Guard';

  let menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle },
    { id: 'cleaning_register', label: 'Cleaning Register', icon: Sparkles },
    { id: 'attendance_register', label: 'Attendance Register', icon: UserCheck },
    { id: 'student_out_register', label: 'Student Out Register', icon: DoorOpen },
    { id: 'late_night_entry', label: 'Late-Night Entry', icon: Clock },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'security_handover', label: 'Security Handover', icon: Shield },
    { id: 'mess', label: 'Mess', icon: UtensilsCrossed },
  ];

  if (isStudent) {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard & Profile', icon: LayoutDashboard },
      { id: 'rooms', label: 'My Allotted Room', icon: BedDouble },
      { id: 'fees', label: 'Fee Dues & Receipts', icon: CreditCard },
      { id: 'complaints', label: 'Complaints', icon: AlertCircle },
      { id: 'student_out_register', label: 'Student Out Register', icon: DoorOpen },
      { id: 'visitors', label: 'Visitor Records', icon: UserCheck },
      { id: 'mess', label: 'Mess Schedule', icon: UtensilsCrossed },
    ];
  } else if (isGuard) {
    // Keep navigation IDs aligned with the tabs actually rendered by GuardDashboard.
    // A tab ID without a matching render condition makes the content area appear blank.
    menuItems = [
      { id: 'dashboard', label: 'Gate Dashboard', icon: LayoutDashboard },
      { id: 'students', label: 'Students Lookup', icon: Users },
      { id: 'visitor_desk', label: 'Visitor Desk', icon: UserCheck },
      { id: 'gate_pass', label: 'Student Gate Pass', icon: DoorOpen },
      { id: 'security_logs', label: 'Security Logs', icon: Shield },
    ];
  }

  return (
    <aside className="w-full md:w-60 lg:w-64 md:sticky md:top-16 md:h-[calc(100vh-4rem)] bg-white md:border-r border-b md:border-b-0 border-slate-200 shrink-0 flex flex-col py-2 md:py-4 shadow-xs min-w-0">
      {/* Role & Hostel Scope Indicator */}
      <div className="hidden md:block px-4 pb-3 mb-2 border-b border-slate-100">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Logged-in Scope
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-bold text-xs text-slate-900">
            {isChiefWarden
              ? 'Chief Warden (All Hostels)'
              : isStudent
              ? `Student Portal (${assignedHostel || 'Resident'})`
              : isGuard
              ? 'Security Guard Desk'
              : `${assignedHostel} Warden Dashboard`}
          </span>
        </div>
        {!isChiefWarden && !isStudent && !isGuard && assignedHostel && (
          <div className="mt-1 text-[11px] text-red-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
            Restricted to {assignedHostel} Records
          </div>
        )}

        {/* Chief Warden: Hostel Selector Filter */}
        {isChiefWarden && onHostelFilterChange && (
          <div className="mt-3">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Hostel View:
            </label>
            <select
              value={selectedHostelFilter || ''}
              onChange={(e) => onHostelFilterChange(e.target.value ? e.target.value : null)}
              className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium focus:outline-none focus:border-red-700"
            >
              <option value="">All 4 Hostels (Overview)</option>
              <option value="GH1">GH1 — Girls Hostel 1</option>
              <option value="GH2">GH2 — Girls Hostel 2 (Flats)</option>
              <option value="BH1">BH1 — Boys Hostel 1</option>
              <option value="BH2">BH2 — Boys Hostel 2</option>
            </select>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex md:flex-col flex-row gap-1 px-2.5 py-1 md:py-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto whitespace-nowrap md:whitespace-normal">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`shrink-0 md:shrink w-auto md:w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition text-left ${
                isActive
                  ? 'bg-red-50 text-red-800 font-semibold border-l-3 border-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Logout */}
      <div className="hidden md:block p-3 border-t border-slate-100 mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
        <div className="text-[10px] text-center text-slate-400 mt-2">
          JK Lakshmipat University • DBMS 2024
        </div>
      </div>
    </aside>
  );
};
