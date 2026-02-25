import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Preventive from './pages/Preventive';
import Breakdown from './pages/Breakdown';
import Spares from './pages/Spares';
import Utilities from './pages/Utilities';
import KPI from './pages/KPI';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/preventive" element={<Preventive />} />
          <Route path="/breakdown" element={<Breakdown />} />
          <Route path="/spares" element={<Spares />} />
          <Route path="/utilities" element={<Utilities />} />
          <Route path="/kpi" element={<KPI />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;


