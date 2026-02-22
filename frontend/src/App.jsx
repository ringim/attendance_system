import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import DevicesPage from "./pages/DevicesPage";
import AttendancePage from "./pages/AttendancePage";
import RealTimeMonitorPage from "./pages/RealTimeMonitorPage";
import BackgroundMonitorPage from "./pages/BackgroundMonitorPage";
import ManualMonitorPage from "./pages/ManualMonitorPage";

// Layout
import MainLayout from "./components/layout/MainLayout";

/**
 * Protected Route Component
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Main App Component
 */
function App() {
  const verifyAuth = useAuthStore((state) => state.verifyAuth);

  useEffect(() => {
    // Verify authentication on mount
    verifyAuth();
  }, [verifyAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="realtime" element={<RealTimeMonitorPage />} />
          <Route
            path="background-monitor"
            element={<BackgroundMonitorPage />}
          />
          <Route path="manual-monitor" element={<ManualMonitorPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
