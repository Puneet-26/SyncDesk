import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Cases } from "./pages/Cases";
import { CaseDetail } from "./pages/CaseDetail";
import { NewCase } from "./pages/NewCase";
import { Institutions } from "./pages/Institutions";
import { InstitutionDetail } from "./pages/InstitutionDetail";
import { OverlapCenter } from "./pages/OverlapCenter";
import { Coordination } from "./pages/Coordination";
import { Alerts } from "./pages/Alerts";
import { Reports } from "./pages/Reports";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminAudit } from "./pages/AdminAudit";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-500 text-xs">
        Authenticating surveillance session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/new" element={<NewCase />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="institutions" element={<Institutions />} />
            <Route path="institutions/:id" element={<InstitutionDetail />} />
            <Route path="overlaps" element={<OverlapCenter />} />
            <Route path="coordination" element={<Coordination />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/audit" element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
