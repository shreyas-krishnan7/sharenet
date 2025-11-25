import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Check if token exists in localStorage
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');

  // If no token or userInfo, redirect to login
  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the component
  return children;
}
