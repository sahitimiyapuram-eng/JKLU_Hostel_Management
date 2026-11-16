import React, { useState } from 'react';
import { Database, LogOut, HelpCircle, Building } from 'lucide-react';
import { JKLULogo } from './JKLULogo.js';
import { Modal } from './Modal.js';

interface HeaderProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    assigned_hostel?: string | null;
  };
  dbStatus: any;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, dbStatus, onLogout }) => {
  const [showDbModal, setShowDbModal] = useState(false);
  const isMySQL = dbStatus?.isMySQL;

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* JKLU Brand & System Title */}
          <div className="flex items-center gap-3">
            <JKLULogo size="md" showText={true} />
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Database Status Button */}
            <button
              onClick={() => setShowDbModal(true)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition ${
                isMySQL
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Click to view database connection status & SQL configuration"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline font-medium text-slate-600">Database:</span>
              <span className="font-semibold">
                {isMySQL ? 'MySQL 8 (Active)' : 'MySQL (Standby / Preview Mode)'}
              </span>
              <HelpCircle className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                  {user.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                      user.role === 'Chief Warden' || user.role.includes('Warden')
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : user.role === 'Student'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {user.role === 'Chief Warden' ? 'Chief Warden' : user.role === 'Student' ? 'Student' : user.role === 'Security Guard' ? 'Security' : `${user.assigned_hostel} Warden`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {user.email}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-700 px-2 py-1 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Database Connection Instructions Modal */}
      <Modal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
        title="MySQL Database Configuration & Instructions"
        subtitle="JK Lakshmipat University Hostel Management System"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-red-700" />
              Database Engine Status:
            </h4>
            <p className="mt-1">
              <strong>Engine Mode:</strong>{' '}
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {isMySQL ? 'Direct MySQL Connection (mysql2/promise)' : 'Embedded Simulation Engine (Pre-seeded with JKLU 4 Hostels)'}
              </span>
            </p>
            <p className="mt-1">
              <strong>Target Schema:</strong>{' '}
              <span className="font-mono">{dbStatus?.config?.database || 'hostel_management'}</span> on{' '}
              <span className="font-mono">
                {dbStatus?.config?.host || 'localhost'}:{dbStatus?.config?.port || '3306'}
              </span>
            </p>
            <p className="mt-1">
              <strong>Configured Hostels:</strong> <span className="font-semibold text-slate-900">GH1, GH2, BH1, BH2</span>
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-1.5">How to Execute database.sql in MySQL Workbench:</h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
              <li>
                Open <strong>MySQL Workbench</strong> or MySQL CLI.
              </li>
              <li>
                Open the included file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">database.sql</code> located in the project root.
              </li>
              <li>
                Click <strong>Execute (⚡)</strong> to create the database <code className="font-mono">hostel_management</code> and all 14 tables + register tables.
              </li>
              <li>
                In <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">.env</code>, configure your local MySQL password:
                <pre className="mt-1 p-2 bg-slate-900 text-slate-100 rounded font-mono text-[11px]">
                  DB_HOST=localhost{'\n'}DB_PORT=3306{'\n'}DB_USER=root{'\n'}DB_PASSWORD=your_actual_password{'\n'}DB_NAME=hostel_management
                </pre>
              </li>
              <li>
                Restart the backend; the app will immediately connect to your live MySQL server.
              </li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  );
};
