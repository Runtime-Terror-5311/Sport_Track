import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

function DashboardGateway() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center gap-3 font-sans">
        <span className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
        <p className="text-xs font-mono text-gray-500 tracking-wider uppercase">Loading System Vault...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Gateway routing based on User permissions role
  if (isAdmin) {
    return <AdminDashboard />;
  } else {
    return <StudentDashboard />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardGateway />
    </AuthProvider>
  );
}

