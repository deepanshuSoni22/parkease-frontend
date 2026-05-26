import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROLE_NAV } from '../constants/navigation';
import { useAuth } from '../state/AuthContext';

export default function RoleRoute({ path, children }) {
  const { session } = useAuth();
  const allowed = ROLE_NAV[session?.role || 'USER'] || ROLE_NAV.USER;

  if (!allowed.includes(path)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
