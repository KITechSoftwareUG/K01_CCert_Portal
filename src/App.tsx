import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Audits from "./pages/Audits";
import AuditDetail from "./pages/AuditDetail";
import CertificationBodies from "./pages/CertificationBodies";
import Auditors from "./pages/Auditors";
import Consultants from "./pages/Consultants";
import Calendar from "./pages/Calendar";
import ActivityLog from "./pages/ActivityLog";
import CertificationsManagement from "./pages/CertificationsManagement";
import AuditTemplates from "./pages/AuditTemplates";
import CertificationDetail from "./pages/CertificationDetail";
import Agents from "./pages/Agents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes with Persistent Layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/audits" element={<Audits />} />
              <Route path="/audits/:id" element={<AuditDetail />} />
              <Route path="/certification-bodies" element={<CertificationBodies />} />
              <Route path="/auditors" element={<Auditors />} />
              <Route path="/consultants" element={<Consultants />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/activity-log" element={<ActivityLog />} />
              <Route path="/certifications/:id" element={<CertificationDetail />} />

              {/* Settings Routes */}
              <Route path="/settings/certifications" element={<CertificationsManagement />} />
              <Route path="/settings/audit-templates" element={<AuditTemplates />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
