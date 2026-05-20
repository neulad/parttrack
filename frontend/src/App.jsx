import React, { createContext, useContext, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DelegateDashboard from './pages/DelegateDashboard.jsx';
import OrderPage from './pages/OrderPage.jsx';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function loadUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload || payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    return null;
  }
  return payload;
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  const login = useCallback((token) => {
    localStorage.setItem('token', token);
    setUser(parseToken(token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route
            path="/order"
            element={!user ? <Navigate to={`/login?next=/order${window.location.search}`} replace /> : <OrderPage />}
          />
          <Route
            path="/*"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === 'admin' ? (
                <AdminDashboard />
              ) : (
                <DelegateDashboard />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
