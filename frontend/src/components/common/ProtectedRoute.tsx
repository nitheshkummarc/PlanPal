import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingPage } from '../ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Only admins may open the page; other signed-in users are sent to the dashboard. */
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    // Remember where the user was going so Login can send them back there
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
