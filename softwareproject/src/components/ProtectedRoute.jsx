import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Check if userInfo exists in localStorage
  const userInfoStr = localStorage.getItem('userInfo');

  // If no userInfo, redirect to login
  if (!userInfoStr) {
    return <Navigate to="/login" replace />;
  }

  // Try to parse userInfo and check for token
  try {
    const userInfo = JSON.parse(userInfoStr);
    if (!userInfo || !userInfo.token) {
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    // If parsing fails, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the component
  return children;
}
