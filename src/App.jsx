import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './state/AuthContext';
import LottieLoader from './components/LottieLoader';
import { useDelayedLoader } from './hooks/useDelayedLoader';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LotsPage from './pages/LotsPage';
import BookingsPage from './pages/BookingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminLotsPage from './pages/AdminLotsPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

function AppInner() {
  const { loading, session } = useAuth();
  const showAppLoader = useDelayedLoader(loading, 450);

  if (showAppLoader) {
    return (
      <LottieLoader fullscreen message="Loading..." />
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="lots/*" element={<LotsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/lots" element={<AdminLotsPage />} />
        <Route path="admin/bookings" element={<AdminBookingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
