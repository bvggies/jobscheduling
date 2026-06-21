import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import { ChatSocketProvider } from './context/ChatSocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import WorkerLayout from './layouts/WorkerLayout';
import HomeRedirect from './components/HomeRedirect';

import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobForm from './pages/JobForm';
import Machines from './pages/Machines';
import MachineForm from './pages/MachineForm';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Register from './pages/Register';
import FeedbackAdmin from './pages/FeedbackAdmin';
import WorkActivity from './pages/WorkActivity';
import TeamManagement from './pages/TeamManagement';
import ServiceManagement from './pages/ServiceManagement';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerJobDetail from './pages/worker/WorkerJobDetail';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerJobs from './pages/customer/CustomerJobs';
import CustomerJobForm from './pages/customer/CustomerJobForm';
import CustomerJobDetail from './pages/customer/CustomerJobDetail';
import CustomerFeedback from './pages/customer/CustomerFeedback';
import ChatPage from './pages/ChatPage';

function AOSRefresh() {
  const location = useLocation();

  useEffect(() => {
    AOS.refresh();
  }, [location]);

  return null;
}

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: false,
      mirror: false,
    });
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatSocketProvider>
        <Router>
        <AOSRefresh />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/new" element={<JobForm />} />
              <Route path="/jobs/edit/:id" element={<JobForm />} />
              <Route path="/machines" element={<Machines />} />
              <Route path="/machines/new" element={<MachineForm />} />
              <Route path="/machines/edit/:id" element={<MachineForm />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/feedback" element={<FeedbackAdmin />} />
              <Route path="/activity" element={<WorkActivity />} />
              <Route path="/team" element={<TeamManagement />} />
              <Route path="/services" element={<ServiceManagement />} />
              <Route path="/chat" element={<ChatPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['worker']} />}>
            <Route element={<WorkerLayout />}>
              <Route path="/worker" element={<WorkerDashboard />} />
              <Route path="/worker/jobs/:id" element={<WorkerJobDetail />} />
              <Route path="/worker/jobs" element={<Jobs workerMode />} />
              <Route path="/worker/schedule" element={<Schedule workerView />} />
              <Route path="/worker/activity" element={<WorkActivity />} />
              <Route path="/worker/alerts" element={<Alerts />} />
              <Route path="/worker/chat" element={<ChatPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['customer']} />}>
            <Route element={<CustomerLayout />}>
              <Route path="/portal" element={<CustomerDashboard />} />
              <Route path="/portal/jobs" element={<CustomerJobs />} />
              <Route path="/portal/jobs/new" element={<CustomerJobForm />} />
              <Route path="/portal/jobs/:id" element={<CustomerJobDetail />} />
              <Route path="/portal/feedback" element={<CustomerFeedback />} />
              <Route path="/portal/chat" element={<ChatPage />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
        </ChatSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
