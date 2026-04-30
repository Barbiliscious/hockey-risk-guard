import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import RiskRegisterPage from "@/pages/RiskRegisterPage";
import RiskMatrixPage from "@/pages/RiskMatrixPage";
import AuditLogPage from "@/pages/AuditLogPage";
import BeSmartActionsPage from "@/pages/BeSmartActionsPage";
import QualityImprovementPage from "@/pages/QualityImprovementPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/risk/dashboard" replace />} />
              <Route path="/risk" element={<Navigate to="/risk/dashboard" replace />} />
              <Route path="/risk/dashboard" element={<DashboardPage />} />
              <Route path="/risk/register" element={<RiskRegisterPage />} />
              <Route path="/risk/actions" element={<BeSmartActionsPage />} />
              <Route path="/risk/qi" element={<QualityImprovementPage />} />
              <Route path="/risk/matrix" element={<RiskMatrixPage />} />
              <Route path="/risk/audit" element={<AuditLogPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
