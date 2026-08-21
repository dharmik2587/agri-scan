import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DiagnosisReport from "@/pages/DiagnosisReport";
import CalculatorPage from "@/pages/Calculator";
import MarketPage from "@/pages/Market";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Advisor from "@/pages/Advisor";
import PesticideInfo from "@/pages/PesticideInfo";
import AuthCallback from "@/pages/AuthCallback";

function AppRouter() {
  const location = useLocation();
  // Detect emergent OAuth callback in URL fragment (synchronously during render)
  if (location.hash?.includes("session_id=")) {
    return (
      <Layout>
        <AuthCallback />
      </Layout>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Layout><Landing /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/scan/:id" element={<Layout><DiagnosisReport /></Layout>} />
      <Route path="/calculator" element={<Layout><CalculatorPage /></Layout>} />
      <Route path="/advisor" element={<Layout><Advisor /></Layout>} />
      <Route path="/pesticide" element={<Layout><PesticideInfo /></Layout>} />
      <Route path="/market" element={<Layout><MarketPage /></Layout>} />
      <Route path="/history" element={<Layout><History /></Layout>} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />
      <Route path="/auth/callback" element={<Layout><AuthCallback /></Layout>} />
      <Route path="*" element={<Layout><Landing /></Layout>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  );
}

export default App;
