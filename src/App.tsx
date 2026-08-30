/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './store/authContext';
import { SocketProvider } from './store/socketContext';
import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { PlayerLoginPage } from './pages/PlayerLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { PlayerQuizPage } from './pages/player/PlayerQuizPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'player' | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <LoadingSpinner label="Initializing GADGET CODE Engine..." size="lg" />
      </div>
    );
  }

  // If authenticated as Admin
  if (isAuthenticated && user?.role === 'ADMIN') {
    return <AdminLayout />;
  }

  // If authenticated as Player
  if (isAuthenticated && user?.role === 'PLAYER') {
    return <PlayerQuizPage />;
  }

  // Login sub-pages
  if (selectedRole === 'admin') {
    return <AdminLoginPage onBack={() => setSelectedRole(null)} />;
  }

  if (selectedRole === 'player') {
    return <PlayerLoginPage onBack={() => setSelectedRole(null)} />;
  }

  // Default: Landing Selection Page
  return <LandingPage onSelectRole={(role) => setSelectedRole(role)} />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

