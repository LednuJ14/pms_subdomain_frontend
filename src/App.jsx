import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './PMS/pages/LoginPage';
import DashboardPage from './PMS/pages/property manager/DashboardPage';
import TenantDashboardPage from './PMS/pages/tenant/TenantDashboardPage';
import StaffDashboardPage from './PMS/pages/staff/StaffDashboardPage';
import StaffTasksPage from './PMS/pages/staff/StaffTasksPage';
import StaffRequestsPage from './PMS/pages/staff/StaffRequestsPage';
import StaffAnnouncementsPage from './PMS/pages/staff/StaffAnnouncementsPage';
import StaffDocumentsPage from './PMS/pages/staff/StaffDocumentsPage';
import StaffFeedbackPage from './PMS/pages/staff/StaffFeedbackPage';
import TenantBillsPage from './PMS/pages/tenant/TenantBillsPage';
import TenantRequestsPage from './PMS/pages/tenant/TenantRequestsPage';
import TenantAnnouncementPage from './PMS/pages/tenant/TenantAnnouncementPage';
import TenantDocumentsPage from './PMS/pages/tenant/TenantDocumentsPage';
import TenantFeedbackPage from './PMS/pages/tenant/TenantFeedbackPage';
import BillsPage from './PMS/pages/property manager/BillsPage';
import RequestsPage from './PMS/pages/property manager/RequestsPage';
import FeedbackPage from './PMS/pages/property manager/FeedbackPage';
import AnnouncementPage from './PMS/pages/property manager/AnnouncementPage';
import TenantsPage from './PMS/pages/property manager/TenantsPage';
import StaffPage from './PMS/pages/property manager/StaffPage';
import DocumentsPage from './PMS/pages/property manager/DocumentsPage';
import AnalyticsPage from './PMS/pages/property manager/AnalyticsPage';
import TasksPage from './PMS/pages/property manager/TasksPage';
import RouteProtection from './PMS/components/RouteProtection';
import SimpleRouteProtection from './PMS/components/SimpleRouteProtection';
import MainLayout from './PMS/components/MainLayout';
import './App.css';

function App() {
  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="App w-full h-screen overflow-hidden">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<MainLayout />}>
            {/* Property Manager Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/announcements" element={<AnnouncementPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/staffs" element={<StaffPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            
            {/* Staff Routes */}
            <Route path="/staff" element={<StaffDashboardPage />} />
            <Route path="/staff/tasks" element={<StaffTasksPage />} />
            <Route path="/staff/requests" element={<StaffRequestsPage />} />
            <Route path="/staff/announcements" element={<StaffAnnouncementsPage />} />
            <Route path="/staff/documents" element={<StaffDocumentsPage />} />
            <Route path="/staff/feedback" element={<StaffFeedbackPage />} />
          
            {/* Tenant Routes */}
            <Route path="/tenant" element={<TenantDashboardPage />} />
            <Route path="/tenant/bills" element={<TenantBillsPage />} />
            <Route path="/tenant/requests" element={<TenantRequestsPage />} />
            <Route path="/tenant/announcements" element={<TenantAnnouncementPage />} />
            <Route path="/tenant/documents" element={<TenantDocumentsPage />} />
            <Route path="/tenant/feedback" element={<TenantFeedbackPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
