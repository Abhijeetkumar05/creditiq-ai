import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AppLayout from './components/AppLayout';
import { LoginPage, SignupPage } from './pages/AuthPages';
import DashboardPage from './pages/DashboardPage';
import PredictPage from './pages/PredictPage';
import HistoryPage from './pages/HistoryPage';
import { AnalyticsPage, ModelInfoPage } from './pages/AnalyticsPage';
import './index.css';

function PrivateRoute({ children }) {
  const { loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-0)' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/signup"     element={<SignupPage />} />
      <Route path="/dashboard"  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/predict"    element={<PrivateRoute><PredictPage /></PrivateRoute>} />
      <Route path="/history"    element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
      <Route path="/analytics"  element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/model-info" element={<PrivateRoute><ModelInfoPage /></PrivateRoute>} />
      <Route path="*"           element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
