import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobForm from './pages/JobForm';
import Machines from './pages/Machines';
import MachineForm from './pages/MachineForm';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
