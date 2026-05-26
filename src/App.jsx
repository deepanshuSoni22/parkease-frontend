import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './state/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LotsPage from './pages/LotsPage';
import BookingsPage from './pages/BookingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminLotsPage from './pages/AdminLotsPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

function AppInner() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen">
        <Spinner animation="border" />
      </div>
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
