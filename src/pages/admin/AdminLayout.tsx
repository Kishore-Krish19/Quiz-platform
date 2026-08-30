import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from '../../components/admin/AdminSidebar';
import { AdminTopBar } from '../../components/admin/AdminTopBar';
import { AdminDashboard } from './AdminDashboard';
import { AdminQuizControl } from './AdminQuizControl';
import { AdminPlayersPage } from './AdminPlayersPage';
import { AdminRoundsPage } from './AdminRoundsPage';
import { AdminQuestionsPage } from './AdminQuestionsPage';
import { AdminLeaderboardPage } from './AdminLeaderboardPage';
import { AdminDocPage } from './AdminDocPage';
import { AdminSettingsPage } from './AdminSettingsPage';

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Admin Dashboard';
      case 'quiz':
        return 'Live Quiz Operations & Control';
      case 'players':
        return 'Competitors & Roster Management';
      case 'rounds':
        return 'Rounds & Sequence Setup';
      case 'questions':
        return 'Technical Questions Bank';
      case 'leaderboard':
        return 'Leaderboard & Analytics';
      case 'docs':
        return 'LAN & Lab Deployment Guide';
      case 'settings':
        return 'System & Audio Settings';
      default:
        return 'Command Center';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigateTab={setActiveTab} />;
      case 'quiz':
        return <AdminQuizControl />;
      case 'players':
        return <AdminPlayersPage />;
      case 'rounds':
        return <AdminRoundsPage />;
      case 'questions':
        return <AdminQuestionsPage />;
      case 'leaderboard':
        return <AdminLeaderboardPage />;
      case 'docs':
        return <AdminDocPage />;
      case 'settings':
        return <AdminSettingsPage />;
      default:
        return <AdminDashboard onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] bg-tech-grid flex">
      {/* Fixed Admin Sidebar */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <AdminTopBar title={getTitle()} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-12">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};
