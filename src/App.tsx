import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { PatientAuthProvider } from "./hooks/usePatientAuth";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import NewPrescriptionPage from "./pages/NewPrescriptionPage";
import PrescriptionsListPage from "./pages/PrescriptionsListPage";
import TemplatesPage from "./pages/TemplatesPage";
import MedicinesPage from "./pages/MedicinesPage";
import ProfilePage from "./pages/ProfilePage";
import DoctorChatPage from "./pages/DoctorChatPage";
import AdvancedFeaturesPage from "./pages/AdvancedFeaturesPage";
import NotFound from "./pages/NotFound";

// Patient Portal
import PatientLoginPage from "./pages/patient/PatientLoginPage";
import { PatientDashboardLayout } from "./components/PatientDashboardLayout";
import PatientDashboardPage from "./pages/patient/PatientDashboardPage";
import PatientPrescriptionsPage from "./pages/patient/PatientPrescriptionsPage";
import PatientPrescriptionDetailPage from "./pages/patient/PatientPrescriptionDetailPage";
import PatientChatPage from "./pages/patient/PatientChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PatientAuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Index />} />

              {/* Doctor Dashboard */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
                <Route path="/prescriptions" element={<PrescriptionsListPage />} />
                <Route path="/prescriptions/new" element={<NewPrescriptionPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/medicines" element={<MedicinesPage />} />
                <Route path="/messages" element={<DoctorChatPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/advanced" element={<AdvancedFeaturesPage />} />
              </Route>

              {/* Patient Portal */}
              <Route path="/patient/login" element={<PatientLoginPage />} />
              <Route element={<PatientDashboardLayout />}>
                <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
                <Route path="/patient/prescriptions" element={<PatientPrescriptionsPage />} />
                <Route path="/patient/prescriptions/:id" element={<PatientPrescriptionDetailPage />} />
                <Route path="/patient/chat" element={<PatientChatPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </PatientAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
