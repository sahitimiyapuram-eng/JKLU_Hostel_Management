import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';
import { JKLULogo } from '../components/JKLULogo.js';
import { apiRequest, setAuthToken, setStoredUser } from '../services/api.js';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  dbStatus: any;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, dbStatus }) => {
  const [identifier, setIdentifier] = useState('chief.warden@jklu.edu.in');
  const [password, setPassword] = useState('warden123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginCategory, setLoginCategory] = useState<'wardens' | 'others'>('wardens');

  const wardenAccounts = [
    {
      title: 'Chief Warden (All 4 Hostels)',
      email: 'chief.warden@jklu.edu.in',
      pass: 'warden123',
      badge: 'Chief Warden',
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
      subtitle: 'Dr. S. K. Sharma • All 4 Hostels Overview & Comparison',
    },
    {
      title: 'GH1 Warden (Girls Hostel 1)',
      email: 'gh1.warden@jklu.edu.in',
      pass: 'warden123',
      badge: 'GH1 Only',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      subtitle: 'Prof. Rekha Gupta • Standard Room Numbering',
    },
    {
      title: 'GH2 Warden (Girls Hostel 2 - Flats)',
      email: 'gh2.warden@jklu.edu.in',
      pass: 'warden123',
      badge: 'GH2 Flats Only',
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      subtitle: 'Dr. Meenakshi Pareek • 4 Flats/Floor (101A, 101B...)',
    },
    {
      title: 'BH1 Warden (Boys Hostel 1)',
      email: 'bh1.warden@jklu.edu.in',
      pass: 'warden123',
      badge: 'BH1 Only',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      subtitle: 'Prof. Amit Joshi • Standard Room Numbering',
    },
    {
      title: 'BH2 Warden (Boys Hostel 2)',
      email: 'bh2.warden@jklu.edu.in',
      pass: 'warden123',
      badge: 'BH2 Only',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      subtitle: 'Dr. Virendra Singh • Standard Room Numbering',
    },
  ];

  const otherAccounts = [
    {
      title: 'Student Resident (BH1 Room 101)',
      email: 'aarav.choudhary@jklu.edu.in',
      pass: 'warden123',
      badge: '2025Btech224',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      subtitle: 'Aarav Choudhary • B.Tech CSE Year 1',
    },
    {
      title: 'Student Resident (GH2 Flat 101A)',
      email: 'ishita.sharma@jklu.edu.in',
      pass: 'warden123',
      badge: '2024BDes008',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      subtitle: 'Ishita Sharma • B.Des Year 2',
    },
    {
      title: 'Security Guard (Gate 1 Post)',
      email: 'rajesh.guard@jklu.edu.in',
      pass: 'warden123',
      badge: 'Security',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      subtitle: 'Rajesh Yadav • Gate Pass & Curfew Verification',
    },
  ];

  const handleQuickLogin = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest('/auth/login', 'POST', {
        identifier,
        password,
      });

      if (response.success && response.token) {
        setAuthToken(response.token);
        setStoredUser(response.user);
        onLoginSuccess(response.user);
      } else {
        setError(response.message || 'Login failed. Please verify email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication service unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="flex justify-center mb-2">
          <JKLULogo size="lg" showText={false} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 font-serif">
          JK LAKSHMIPAT UNIVERSITY
        </h1>
        <p className="text-xs font-bold text-red-800 uppercase tracking-widest mt-0.5">
          Hostel Management System
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Authorized Campus Residential Administration (GH1, GH2, BH1, BH2)
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-6 px-6 shadow-xs border border-slate-200 rounded-md sm:px-8">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email or Roll Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. chief.warden@jklu.edu.in or 2025Btech224"
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded text-xs font-bold text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition disabled:opacity-50 tracking-wide uppercase"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </div>
          </form>

          {/* Quick-Click Demo Roles for Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Evaluation Accounts
              </span>
              <div className="inline-flex rounded-sm p-0.5 bg-slate-100 border border-slate-200 text-[10px]">
                <button
                  type="button"
                  onClick={() => setLoginCategory('wardens')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    loginCategory === 'wardens' ? 'bg-white font-bold text-red-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  5 Wardens
                </button>
                <button
                  type="button"
                  onClick={() => setLoginCategory('others')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    loginCategory === 'others' ? 'bg-white font-bold text-red-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Student & Guard
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {(loginCategory === 'wardens' ? wardenAccounts : otherAccounts).map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email, account.pass)}
                  className="w-full text-left p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-[11px]">{account.title}</div>
                    <div className="text-[10px] text-slate-500">{account.subtitle}</div>
                  </div>
                  <span className={`text-[10px] border px-1.5 py-0.5 rounded font-semibold ${account.badgeClass}`}>
                    {account.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
