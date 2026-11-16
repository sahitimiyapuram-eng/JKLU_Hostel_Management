/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest, getAuthToken, getStoredUser, removeAuthToken } from './services/api.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { LoginPage } from './pages/LoginPage.js';
import { JKLUDashboard } from './pages/JKLUDashboard.js';
import { StudentDashboard } from './pages/StudentDashboard.js';
import { GuardDashboard } from './pages/GuardDashboard.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch system & database status
  const fetchSystemStatus = async () => {
    try {
      const res = await apiRequest('/system/status');
      if (res.success) {
        setDbStatus(res.status);
      }
    } catch (err) {
      console.warn('System status check error:', err);
    }
  };

  useEffect(() => {
    fetchSystemStatus();

    const token = getAuthToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setCurrentUser(storedUser);
      apiRequest('/auth/me')
        .then((res) => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
          }
        })
        .catch(() => {
          removeAuthToken();
          setCurrentUser(null);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    setSelectedHostelFilter(null);
    fetchSystemStatus();
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs font-mono">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-red-800 border-t-transparent rounded-full animate-spin" />
          <span>Loading JKLU Hostel Management System...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} dbStatus={dbStatus} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header user={currentUser} dbStatus={dbStatus} onLogout={handleLogout} />

      <div className="flex-1 flex min-h-0 flex-col md:flex-row">
        <Sidebar
          role={currentUser.role}
          assignedHostel={currentUser.assigned_hostel}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          selectedHostelFilter={selectedHostelFilter}
          onHostelFilterChange={setSelectedHostelFilter}
        />

        <main className="flex-1 min-w-0 w-full p-3 sm:p-5 lg:p-6 overflow-x-hidden overflow-y-auto">
          {currentUser.role === 'Student' ? (
            <StudentDashboard
              activeTab={activeTab}
              onTabChange={setActiveTab}
              currentUser={currentUser}
            />
          ) : currentUser.role === 'Security Guard' ? (
            <GuardDashboard
              activeTab={activeTab}
              onTabChange={setActiveTab}
              currentUser={currentUser}
            />
          ) : (
            <JKLUDashboard
              user={currentUser}
              activeTab={activeTab}
              selectedHostelFilter={selectedHostelFilter}
              onSelectHostel={setSelectedHostelFilter}
            />
          )}
        </main>
      </div>
    </div>
  );
}
